import { WebSocketServer, WebSocket } from 'ws';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import http from 'http';

// LocalStack DynamoDB configuration
const dynamoDB = new DynamoDBDocumentClient(new DynamoDBClient({
  endpoint: "http://localhost:4566", // Use localhost when running on the host machine
  region: "us-east-1",
  credentials: {
    accessKeyId: "test",
    secretAccessKey: "test"
  },
  maxAttempts: 5,
  httpOptions: {
    timeout: 10000,
    connectTimeout: 5000
  }
}));

// Connection tracking
const connections = new Map();


// Create WebSocket server
const wss = new WebSocketServer({ port: 3001 });

console.log('WebSocket server started on port 3001');

wss.on('connection', (ws) => {
  const connectionId = uuidv4();
  connections.set(connectionId, ws);

  console.log(`Client connected: ${connectionId}`);

  ws.on('message', async (message) => {
    try {
      const payload = JSON.parse(message);
      console.log(`Message from ${connectionId}:`, payload);

      if (payload.action === 'subscribe' && payload.taskId) {
        console.log(`Processing subscription request for ${connectionId} to taskId: ${payload.taskId}`);

        // Send confirmation immediately before DynamoDB interaction
        ws.send(JSON.stringify({
          message: 'Subscription request received',
          taskId: payload.taskId,
          status: 'processing'
        }));

        // Use setImmediate to prevent event loop blocking
        setImmediate(() => {
          dynamoDB.send(new PutCommand({
            TableName: 'demoWebsiteAnalysisResults',
            Item: {
              taskId: payload.taskId,
              connectionId: connectionId,
              type: 'subscription',
              createdAt: new Date().toISOString()
            }
          }))
          .then(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                message: 'Subscription successful',
                taskId: payload.taskId
              }));
            }
          })
          .catch(error => {
            console.error('DynamoDB error:', error);
            // Still send a response to client even if DB operation fails
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                message: 'Subscription partially processed - database error',
                taskId: payload.taskId,
                status: 'warning'
              }));
            }
          });
        });
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('error', (error) => {
    console.error(`WebSocket error for ${connectionId}:`, error);
  });

  ws.on('close', async (code, reason) => {
    console.log(`Client disconnected: ${connectionId}. Code: ${code}, Reason: ${reason || 'No reason provided'}`);
    connections.delete(connectionId);
  });

  // Add ping/pong handlers to debug connection issues
  ws.on('ping', () => {
    console.log(`Received ping from ${connectionId}`);
  });

  ws.on('pong', () => {
    console.log(`Received pong from ${connectionId}`);
  });
});

// Keep connections alive with ping
setInterval(() => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.ping();
    }
  });
}, 30000);

// Function to broadcast updates to subscribers
async function broadcastUpdate(taskId, data) {
  console.log(`recieved: ${JSON.stringify(data,2)}`);

  try {

    // Get all subscriptions for this taskId using scan
    const subscriptions = await dynamoDB.send(new ScanCommand({
      TableName: 'demoWebsiteAnalysisResults',
      FilterExpression: 'taskId = :taskId',
      ExpressionAttributeValues: {
        ':taskId': taskId,
      }
    }));

    console.log(`Sending to ${subscriptions.Items?.length || 0} subscribers`);

    for (const subscription of subscriptions.Items || []) {
      const ws = connections.get(subscription.connectionId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          message: 'Task update',
          taskId,
          data
        }), (error) => {
          if (error) console.error('Error sending update:', error);
        });
      }
    }
  } catch (error) {
    console.error('Error in broadcastUpdate:', error);
  }
}

// Create an HTTP server to receive updates from Lambda
const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/broadcast') {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const data = JSON.parse(body);

        if (data.taskId) {
          await broadcastUpdate(data.taskId, data);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Update broadcast successful' }));
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'taskId is required' }));
        }
      } catch (error) {
        console.error('Error broadcasting update:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(3002, () => {
  console.log('HTTP server started on port 3002');
});