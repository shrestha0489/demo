import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import crypto from 'crypto'; // Using built-in crypto instead of uuid package

const client = new DynamoDBClient({});
const dynamoDb = DynamoDBDocumentClient.from(client);
const lambda = new LambdaClient({});

// Generate UUID using crypto
function generateUUID() {
  return crypto.randomUUID();
}

async function createTask(url, taskId) {
  const params = {
    TableName: "demoWebsiteAnalysisResults",
    Item: {
      taskId,
      url,
      status: "pending",
      timestamp: new Date().toISOString(),
    },
  };
  
  return dynamoDb.send(new PutCommand(params));
}

export const handler = async (event) => {
  try {
    // Handle different content types and API Gateway payload formats
    let body;
    if (event.body) {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } else {
      body = event;
    }

    console.log('Event:', JSON.stringify(event));
    console.log('Parsed body:', body);

    const { url } = body;

    if (!url) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({ message: "URL is required" })
      };
    }

    const taskId = generateUUID();
    await createTask(url, taskId);

    // Lambda invocation parameters
    const lambdaParams = {
      FunctionName: "demoWebsiteAnalysisFunction",
      InvocationType: "Event",
      Payload: JSON.stringify({ url, taskId })
    };

    // Trigger the Lambda function asynchronously
    await lambda.send(new InvokeCommand(lambdaParams));
    console.log(`Lambda function triggered for task: ${taskId}`);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({ taskId })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({ 
        message: "Internal server error",
        error: error.message 
      })
    };
  }
};