//lambda for default route for websocket, for hanldling all the incoming client actions over websocket apart from connection and disconnection requests
// used to save info, like which user has requested for which url for processing, so that when the results are ready, we know whom to send it
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

// Initialize DynamoDB client
const client = new DynamoDBClient({});
const dynamoDb = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const { taskId } = JSON.parse(event.body);

  console.log("Handling connectionId:", connectionId, "taskId:", taskId);

  try {
    await dynamoDb.send(
      new PutCommand({
        TableName: "WebSocketConnections",
        Item: {
          connectionId, 
          taskId,        
        },
      })
    );

    console.log(`Successfully updated taskId for connectionId: ${connectionId}`);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Task ID updated successfully." }),
    };
  } catch (error) {
    console.error("Error updating subscription:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to update task ID." }),
    };
  }
};