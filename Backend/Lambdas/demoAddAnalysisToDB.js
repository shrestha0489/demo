import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

// Initialize DynamoDB client
const client = new DynamoDBClient({});
const dynamoDb = DynamoDBDocumentClient.from(client);

export const addAnalysisToDB = async (event) => {
  try {
    // Parse the incoming event body
    let data;
    
    if (event.body) {
      try {
        data = JSON.parse(event.body);
      } catch (e) {
        console.error("JSON parsing error:", e);
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Invalid JSON payload' })
        };
      }
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing request body',event,body:event.body })
      };
    }

    // Validate required fields
    if (!data.url) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'URL is required' })
      };
    }

    console.log("Processing analysis for URL:", data.url);

    // Prepare the item to be saved in DynamoDB
    const item = {
      url: data.url,
      problem: data.problem || null,
      solution: data.solution || null,
      impact: data.impact || null,
      timestamp: new Date().toISOString()
    };

    // Save to DynamoDB using the PutCommand
    await dynamoDb.send(
      new PutCommand({
        TableName: "demoWebsiteAnalysis",
        Item: item
      })
    );

    console.log("Successfully saved analysis for URL:", data.url);

    // Return success response
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Website analysis saved successfully',
        url: data.url
      })
    };
  } catch (error) {
    console.error('Error saving analysis to DynamoDB:', error);
    
    // Return error response
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to save website analysis',
        details: error.message
      })
    };
  }
};