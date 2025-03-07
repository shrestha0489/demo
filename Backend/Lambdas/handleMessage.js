import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

// Initialize DynamoDB client
const client = new DynamoDBClient({});
const dynamoDb = DynamoDBDocumentClient.from(client);

export const handleMessage = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const { taskId } = JSON.parse(event.body);

  console.log("Handling connectionId:", connectionId, "taskId:", taskId);

  try {
    // Use PutCommand to ensure taskId is directly associated with the connectionId
    await dynamoDb.send(
      new PutCommand({
        TableName: "demoWebsiteAnalysisResults",
        Item: {
          taskId, // Set the connectionId as the key
          connectionId, // Set the taskId to associate with the connectionId
        },
      }),
    );

    console.log(
      `Successfully updated taskId for connectionId: ${connectionId}`,
    );
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
