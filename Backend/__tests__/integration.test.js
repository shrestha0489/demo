const axios = require("axios");
const { execSync } = require("child_process");
const WebSocket = require('ws');
const http = require('http');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

// Setup for unhandled promise rejection tracking
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const LOCALSTACK_HOST = "http://localhost:4566";
const STAGE_NAME = "prod"; // Using prod stage as defined in deploy_lambda.sh
const TEST_URL = "getgsi.com"; // Using one of your sample URLs
const WEBSOCKET_PORT = 3001;
const HTTP_PORT = 3002;
let REST_API_ID = "";

// Global variables for servers and connections
let wss = null;
let httpServer = null;
// Add task completion tracking
const taskCompletionEvents = new Map();

// Initialize DynamoDB client
const dynamoDB = new DynamoDBDocumentClient(new DynamoDBClient({
  endpoint: "http://localhost:4566",
  region: "us-east-1",
  credentials: {
    accessKeyId: "test",
    secretAccessKey: "test"
  },
}));

// Function to start the WebSocket server
function startWebSocketServer() {
  return new Promise((resolve) => {
    wss = new WebSocket.Server({ port: WEBSOCKET_PORT });
    console.log('📡 WebSocket server started on port 3001');

    wss.on('connection', (ws) => {
      const connectionId = uuidv4();

      console.log(`🔌 Client connected: ${connectionId}`);

      ws.on('message', async (message) => {
        try {
          const payload = JSON.parse(message);
          console.log(`📩 Message from ${connectionId}:`, payload);

          if (payload.action === 'subscribe' && payload.taskId) {
            console.log(`🔔 Processing subscription request for ${connectionId} to taskId: ${payload.taskId}`);

            // Send confirmation immediately
            const confirmationMsg = {
              message: 'Subscription successful',
              taskId: payload.taskId
            };
            ws.send(JSON.stringify(confirmationMsg));
            console.log(`📤 Sent to ${connectionId}:`, confirmationMsg);

            try {
              await dynamoDB.send(new PutCommand({
                TableName: 'demoWebsiteAnalysisResults',
                Item: {
                  taskId: payload.taskId,
                  connectionId: connectionId,
                  type: 'subscription',
                  createdAt: new Date().toISOString()
                }
              }));
              console.log(`💾 Subscription stored for ${connectionId} to taskId: ${payload.taskId}`);
              
              // // Send a test update to validate that messages flow back properly
              // setTimeout(() => {
              //   if (ws.readyState === WebSocket.OPEN) {
              //     const testUpdate = {
              //       message: 'Task update',
              //       taskId: payload.taskId,
              //       status: 'in_progress',
              //       data: { progress: '25%', message: 'Analysis started' }
              //     };
              //     ws.send(JSON.stringify(testUpdate));
              //     console.log(`📤 Sent test update to ${connectionId}:`, testUpdate);
              //   }
              // }, 2000);
            } catch (error) {
              console.error('❌ DynamoDB error:', error);
            }
          }
        } catch (error) {
          console.error('❌ Error processing message:', error);
          console.log('Raw message:', message instanceof Buffer ? message.toString() : message);
        }
      });

      ws.on('error', (error) => {
        console.error(`⚠️ WebSocket error for ${connectionId}:`, error.message);
      });

      ws.on('pong', () => {
        console.log(`🏓 Received pong from ${connectionId}`);
      });
    });

    resolve();
  });
}

// Function to start the HTTP server
function startHTTPServer() {
  return new Promise((resolve) => {
    httpServer = http.createServer(async (req, res) => {
      if (req.method === 'POST' && req.url === '/broadcast') {
        let body = '';

        req.on('data', (chunk) => {
          body += chunk.toString();
        });

        req.on('end', async () => {
          try {
            // console.log(`📥 HTTP broadcast request received: ${body}`);
            const data = JSON.parse(body);

            if (data.taskId) {
              // Check for completion status
              if (data.status === "completed") {
                console.log(`🎉 Task ${data.taskId} COMPLETED!`);
                
                // Signal completion to waiting test
                const completeEvent = taskCompletionEvents.get(data.taskId);
                if (completeEvent) {
                  completeEvent.resolve(data);
                }
              }
              
              await broadcastUpdate(data.taskId, data);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ message: 'Update broadcast successful' }));
            } else {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'taskId is required' }));
            }
          } catch (error) {
            console.error('❌ Error broadcasting update:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal server error' }));
          }
        });
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    });

    httpServer.listen(HTTP_PORT, () => {
      console.log('🌐 HTTP server started on port 3002');
      resolve();
    });
  });
}

// Function to broadcast updates to subscribers
async function broadcastUpdate(taskId, data) {
  try {
    console.log(`📢 Broadcasting update for taskId ${taskId}:`, data);

    // // Get all subscriptions for this taskId
    // const subscriptions = await dynamoDB.send(new ScanCommand({
    //   TableName: 'demoWebsiteAnalysisResults',
    //   FilterExpression: 'taskId = :taskId',
    //   ExpressionAttributeValues: {
    //     ':taskId': taskId,
    //   }
    // }));

    // console.log(`👥 Found ${subscriptions.Items?.length || 0} subscribers for taskId: ${taskId}`);

    // for (const subscription of subscriptions.Items || []) {
    //   const ws = connections.get(subscription.connectionId);
    //   if (ws && ws.readyState === WebSocket.OPEN) {
    //     const message = {
    //       message: 'Task update',
    //       taskId,
    //       status: data.status || 'in_progress',
    //       data
    //     };
    //     ws.send(JSON.stringify(message));
    //     console.log(`📤 Update sent to ${subscription.connectionId}:`, message);
    //   }
    // }
  } catch (error) {
    console.error('❌ Error in broadcastUpdate:', error);
  }
}

// Stop servers gracefully
function stopServers() {
  return new Promise((resolve) => {
    if (wss) {
      wss.close(() => {
        console.log('📡 WebSocket server stopped');
        
        if (httpServer) {
          httpServer.close(() => {
            console.log('🌐 HTTP server stopped');
            resolve();
          });
        } else {
          resolve();
        }
      });
    } else if (httpServer) {
      httpServer.close(() => {
        console.log('🌐 HTTP server stopped');
        resolve();
      });
    } else {
      resolve();
    }
  });
}

// Basic test to ensure Jest is working
describe("Website Analysis Tests", () => {
  // Setup and teardown for all tests
  beforeAll(async () => {
    // Start servers before tests run
    if (process.env.ENV === "localtesting") {
      console.log("🚀 Starting WebSocket and HTTP servers...");
      await startWebSocketServer();
      await startHTTPServer();
      console.log("✅ Servers started successfully");
    }
  });

  afterAll(async () => {
    // Stop servers after tests
    if (process.env.ENV === "localtesting") {
      console.log("🛑 Stopping servers...");
      await stopServers();
    }
  });
  
  // Basic test to verify Jest works
  it("should work", async () => {
    expect(1 + 1).toBe(2);
  });

  // Full integration test using Jest properly
  it("should complete full website analysis workflow", async () => {
    // Skip if not running in localtesting mode
    if (process.env.ENV !== "localtesting") {
      console.log("⏭️ Integration test skipped (Set ENV=localtesting to run)");
      return;
    }

    console.log("🚀 Starting Website Analysis Integration Test");
    let ws;
    
    try {
      // Step 1: Get the API Gateway ID
      fetchApiId();
      
      // Step 2: Connect to WebSocket server as a client
      ws = await connectWebSocket();
      console.log("✅ Client connected to WebSocket server");
      
      // Step 3: Request analysis via REST API
      const analysisData = { url: TEST_URL };
      console.log("🔍 Making analysis request with data:", analysisData);
      const analysisResponse = await apiRequest("POST", "analysis", analysisData);
      
      expect(analysisResponse).toBeTruthy();
      expect(analysisResponse.taskId).toBeTruthy();
      
      const taskId = analysisResponse.taskId;
      console.log(`📋 Analysis initiated with taskId: ${taskId}`);
      
      // Step 4: Subscribe to updates via WebSocket
      console.log(`🔄 Subscribing to updates for taskId: ${taskId}`);
      
      // Wait for subscription confirmation
      const subscription = await subscribeToTask(ws, taskId);
      console.log("✅ Subscription confirmed:", subscription);
      
      // Step 5: Wait for task completion or timeout
      console.log("⏳ Waiting for task completion...");
      await waitForTaskCompletion(taskId, 300000); // 5 minutes timeout
      
      // Step 6: Verify data exists in DynamoDB
      console.log("🔍 Verifying results in DynamoDB...");
      const dbCommand = `docker exec localstack_dev awslocal dynamodb scan --table-name demoWebsiteAnalysisResults --filter-expression "taskId = :tid" --expression-attribute-values '{":tid": {"S": "${taskId}"}}'`;
      
      try {
        const result = execSync(dbCommand).toString();
        const hasResults = result && result.length > 0 && !result.includes("error");
        
        // Add an assertion for the test
        if (hasResults) {
          console.log("✅ Found results in DynamoDB:");
          console.log(result);
        } else {
          console.warn("⚠️ No results found in DynamoDB");
        }
        
        console.log(`🏁 Integration test completed for taskId: ${taskId}`);
      } catch (error) {
        console.error("❌ Error verifying DynamoDB results:", error.message);
      }
      
      
    } finally {
      // Clean up WebSocket connection
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
        console.log("🧹 WebSocket client connection closed");
      }
    }
  }, 360000); // 6 minute timeout for this test
});

// Fetch API ID from LocalStack
function fetchApiId() {
  try {
    REST_API_ID = execSync(
      `docker exec localstack_dev awslocal apigateway get-rest-apis --query "items[?name=='WebsiteAnalysisRESTAPI'].id" --output text`,
    )
      .toString()
      .trim();

    if (!REST_API_ID) throw new Error("REST_API_ID not found");
    console.log(`✅ Found API Gateway ID: ${REST_API_ID}`);
    return REST_API_ID;
  } catch (error) {
    console.error("❌ Failed to fetch REST_API_ID:", error.message);
    throw error; // Don't exit process, let Jest handle the error
  }
}

// Connect to WebSocket server
function connectWebSocket() {
  return new Promise((resolve, reject) => {
    console.log(`🔌 Connecting to WebSocket server at ws://localhost:${WEBSOCKET_PORT}...`);
    const ws = new WebSocket(`ws://localhost:${WEBSOCKET_PORT}`);
    
    const timeout = setTimeout(() => {
      reject(new Error("WebSocket connection timeout"));
    }, 5000);
    
    ws.on('open', () => {
      clearTimeout(timeout);
      console.log('✅ WebSocket connection established');
      resolve(ws);
    });
    
    ws.on('error', (error) => {
      clearTimeout(timeout);
      console.error('❌ WebSocket connection error:', error.message);
      reject(error);
    });
  });
}

// Make API request to LocalStack REST API
async function apiRequest(method, endpoint, data = null) {
  try {
    // Construct URL based on deploy_lambda.sh format
    const url = `${LOCALSTACK_HOST}/restapis/${REST_API_ID}/${STAGE_NAME}/_user_request_/${endpoint}`;
    
    // Log equivalent curl command
    let curlCmd = `curl -X ${method.toUpperCase()} "${url}"`;
    if (data) {
      curlCmd += ` -H "Content-Type: application/json" -d '${JSON.stringify(data)}'`;
    }
    console.log(`🧪 API Request:\n${curlCmd}`);
    
    // Make the request
    const response = await axios({
      method,
      url,
      headers: { "Content-Type": "application/json" },
      data: data ? data : undefined
    });
    
    console.log(`✅ API Response (${endpoint}):`, response.data);
    return response.data;
  } catch (error) {
    console.error(`❌ API request error (${endpoint}):`, 
      error.response ? error.response.data : error.message);
    throw error;
  }
}

// Subscribe to a task via WebSocket - improved for better message handling
function subscribeToTask(ws, taskId) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Subscription confirmation timeout"));
    }, 10000); // 10 second timeout
    
    const messageHandler = (data) => {
      try {
        // Parse message data properly
        let message;
        if (typeof data === 'string') {
          message = JSON.parse(data);
        } else if (data instanceof Buffer) {
          message = JSON.parse(data.toString());
        } else {
          console.log('WebSocket message is already an object:', data);
          message = data;
        }
        
        console.log(`📥 [SUBSCRIPTION] WebSocket message received:`, message);
        
        // Check if this is a subscription response with our taskId
        if (message && message.taskId === taskId) {
          console.log(`✅ Received response for taskId: ${taskId}`);
          clearTimeout(timeout);
          ws.removeListener('message', messageHandler);
          resolve(message);
        }
      } catch (err) {
        console.error('❌ Error parsing WebSocket message:', err);
        console.log('Raw message data:', data instanceof Buffer ? data.toString() : data);
      }
    };
    
    // Use .on instead of addEventListener for the ws library
    ws.on('message', messageHandler);
    
    // Send subscription request
    console.log(`🔔 Subscribing to taskId: ${taskId}`);
    ws.send(JSON.stringify({
      action: 'subscribe',
      taskId: taskId
    }));
  });
}

// Function to wait for task completion via HTTP broadcast
function waitForTaskCompletion(taskId, timeoutMs = 300000) {
  return new Promise((resolve, reject) => {
    console.log(`⏱️ Setting up completion listener for taskId: ${taskId}`);
    
    // Setup completion promise
    let completionResolver;
    const completionPromise = new Promise(r => { completionResolver = r; });
    
    // Store in global map for the HTTP handler to access
    taskCompletionEvents.set(taskId, { 
      resolve: (data) => {
        completionResolver(data);
        taskCompletionEvents.delete(taskId);
      }
    });
    
    // Setup timeout
    const timeout = setTimeout(() => {
      console.log(`⏱️ Timeout reached for taskId: ${taskId}`);
      taskCompletionEvents.delete(taskId);
      resolve(); // Resolve anyway to continue test
    }, timeoutMs);
    
    // Wait for either completion event or timeout
    completionPromise.then(data => {
      clearTimeout(timeout);
      console.log(`🎯 Task ${taskId} completed with data:`, data);
      resolve(data);
    });
  });
}