import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

// Initialize DynamoDB client
const client = new DynamoDBClient({});
const dynamoDb = DynamoDBDocumentClient.from(client);

export const handleMessage = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const { taskId, url } = JSON.parse(event.body);

  console.log("Handling connectionId:", connectionId, "taskId:", taskId, "url:", url);

  try {
    await dynamoDb.send(
      new DeleteCommand({
        TableName: "demoWebsiteAnalysis",
        Key: {
          url,
          taskId_connectionId: `${taskId}$$$${taskId}`,
        },
      }),
    );

    await dynamoDb.send(
      new PutCommand({
        TableName: "demoWebsiteAnalysis",
        Item: {
          url, // PK
          taskId_connectionId: `${taskId}$$$${connectionId}`, // composite SK
        },
      }),
    );

    console.log(
      `Successfully updated record for url: ${url}, taskId: ${taskId}, connectionId: ${connectionId}`,
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
