import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  UpdateCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";

// Configuration from environment variables
const CONFIG = {
  WEBSOCKET_ENDPOINT:
    process.env.WEBSOCKET_ENDPOINT ||
    "wss://he7ifebjve.execute-api.us-east-1.amazonaws.com/production/",
  MAX_RETRIES: parseInt(process.env.MAX_RETRIES || "3"),
  RETRY_DELAY: parseInt(process.env.RETRY_DELAY || "1000"),
  CONNECTIONS_TABLE:
    process.env.CONNECTIONS_TABLE || "demoWebsocketConnections",
  ANALYSIS_TABLE: process.env.ANALYSIS_TABLE || "demoWebsiteAnalysisResults",
};

// Initialize DynamoDB clients
const client = new DynamoDBClient({});
const dynamoDb = DynamoDBDocumentClient.from(client);

// Sample problems for analysis
const websiteIssues = {
  "getgsi.com": [
    {
      problemDescription: "The page has a slow load time.",
      solutionText: "Optimize images and leverage caching to reduce load time.",
      impactText: "Improving load time can increase conversions by up to 15%.",
    },
    {
      problemDescription: "The call-to-action button is not prominent.",
      solutionText:
        "Change the color and size of the call-to-action button to make it more visible.",
      impactText:
        "A prominent call-to-action can increase click-through rates by 20%.",
    },
    {
      problemDescription: "The page is not mobile-friendly.",
      solutionText:
        "Implement responsive design to improve the mobile experience.",
      impactText: "A mobile-friendly page can reduce bounce rates by 30%.",
    },
  ],
  "getgsi.com": [
    {
      problemDescription: "The about page has too much text without visuals.",
      solutionText:
        "Add relevant images and break up text into smaller sections.",
      impactText: "Improving readability can enhance user engagement by 25%.",
    },
    {
      problemDescription: "The page lacks social proof (testimonials/reviews).",
      solutionText: "Include customer testimonials or reviews to build trust.",
      impactText:
        "Adding social proof can improve credibility and conversion rates.",
    },
  ],
};

const normalizeUrl = (url) => {
  return url.replace(/^https?:\/\//, "");
};

// Helper function to validate if URL exists in our database
const validateUrl = (url) => {
  const normalizedUrl = normalizeUrl(url);
  return websiteIssues.hasOwnProperty(normalizedUrl) ? normalizedUrl : null;
};

// Utility function for delay with exponential backoff
const delay = (attempt) => {
  const backoff = Math.min(CONFIG.RETRY_DELAY * Math.pow(2, attempt), 5000);
  return new Promise((resolve) => setTimeout(resolve, backoff));
};

// New function to find WebSocket connection for a taskId with exponential backoff
async function findConnectionIdForTask(taskId) {
  for (let attempt = 0; attempt < CONFIG.MAX_RETRIES; attempt++) {
    try {
      const params = {
        TableName: CONFIG.CONNECTIONS_TABLE,
        KeyConditionExpression: "taskId = :taskId",
        ExpressionAttributeValues: { ":taskId": taskId },
      };

      const result = await dynamoDb.send(new QueryCommand(params));
      if (result.Items && result.Items.length > 0) {
        return result.Items[0].connectionId;
      }

      if (attempt < CONFIG.MAX_RETRIES - 1) {
        await delay(attempt);
      }
    } catch (error) {
      console.error(
        `Error finding connectionId for taskId (attempt ${attempt + 1}):`,
        error,
      );
      if (attempt < CONFIG.MAX_RETRIES - 1) {
        await delay(attempt);
      }
    }
  }
  return null;
}

// Event parsing function with enhanced validation
export const parseEvent = (event) => {
  console.log("Received event:", JSON.stringify(event, null, 2));

  try {
    const payload =
      typeof event.body === "string"
        ? JSON.parse(event.body)
        : event.body || event;

    if (!payload.url || !payload.taskId) {
      throw new Error("URL and taskId are required in the payload");
    }

    const endpoint = event.requestContext
      ? `https://${event.requestContext.domainName}/${event.requestContext.stage}`
      : CONFIG.WEBSOCKET_ENDPOINT.replace("wss://", "https://");

    return {
      url: payload.url,
      taskId: payload.taskId,
      connectionId: event.requestContext?.connectionId,
      endpoint,
    };
  } catch (error) {
    throw new Error(`Event parsing failed: ${error.message}`);
  }
};

// Enhanced WebSocket message sender with connection status handling
export const sendMessageToClient = async (connectionId, message, endpoint) => {
  if (!connectionId || !endpoint) {
    console.log(
      "Skipping WebSocket message - missing connectionId or endpoint",
    );
    return;
  }

  const client = new ApiGatewayManagementApiClient({
    endpoint: endpoint.replace("wss://", "https://"),
    maxAttempts: CONFIG.MAX_RETRIES,
  });

  const params = {
    ConnectionId: connectionId,
    Data: JSON.stringify({
      ...message,
      timestamp: new Date().toISOString(),
    }),
  };

  try {
    await client.send(new PostToConnectionCommand(params));
    console.log(`Message sent to connection: ${connectionId}`);
  } catch (error) {
    if (error.name === "GoneException") {
      console.log(`Connection ${connectionId} is no longer available`);
      return;
    }
    console.error(
      `Error sending message to connection ${connectionId}:`,
      error,
    );
    throw error;
  }
};

// Helper function to update task status in DynamoDB
export const updateTaskStatus = async (taskId, status, data = {}) => {
  console.log("Updating task status in DynamoDB:", taskId, status, data);

  const timestamp = new Date().toISOString();
  const updateExpression = ["set #status = :status", "#timestamp = :timestamp"];
  const expressionAttributeValues = {
    ":status": status,
    ":timestamp": timestamp,
  };
  const expressionAttributeNames = {
    "#status": "status",
    "#timestamp": "timestamp",
  };

  if (data.problems) {
    updateExpression.push("problems = :problems");
    expressionAttributeValues[":problems"] = data.problems;
  }

  if (data.error) {
    updateExpression.push("#error = :error");
    expressionAttributeValues[":error"] = data.error;
    expressionAttributeNames["#error"] = "error";
  }

  const params = {
    TableName: CONFIG.ANALYSIS_TABLE,
    Key: { taskId },
    UpdateExpression: updateExpression.join(", "),
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
  };

  try {
    await dynamoDb.send(new UpdateCommand(params));
    console.log(`Task ${taskId} updated successfully in DynamoDB`);
    return true;
  } catch (error) {
    console.error("Error updating task status in DynamoDB:", error);
    throw error;
    return false;
  }
};

// Enhanced progress update with error handling
export const sendProgressUpdate = async (
  connectionId,
  endpoint,
  taskId,
  currentStep,
  progress,
) => {
  if (!connectionId || !endpoint) return;

  try {
    await sendMessageToClient(
      connectionId,
      {
        taskId,
        status: "processing",
        currentStep,
        progress,
        timestamp: new Date().toISOString(),
      },
      endpoint,
    );
  } catch (error) {
    console.warn(`Failed to send progress update for task ${taskId}:`, error);
    // Continue execution - progress updates are non-critical
  }
};

// Enhanced Lambda handler with comprehensive error handling
export const handler = async (event) => {
  let taskId;
  let connectionId;

  try {
    console.log(
      "Lambda invocation with event:",
      JSON.stringify(event, null, 2),
    );
    const parsedEvent = parseEvent(event);
    taskId = parsedEvent.taskId;

    // Find the associated WebSocket connection
    connectionId = await findConnectionIdForTask(taskId);
    console.log(`Found connectionId ${connectionId} for taskId ${taskId}`);

    // Validate URL
    const validUrl = validateUrl(parsedEvent.url);
    if (!validUrl) {
      // Send error message through WebSocket if URL doesn't exist
      if (connectionId) {
        await sendMessageToClient(
          connectionId,
          {
            taskId,
            status: "error",
            error: "Client doesn’t exist",
            currentStep: "validation",
            progress: 0,
          },
          parsedEvent.endpoint,
        );
      }

      // Update task status to error
      await updateTaskStatus(taskId, "error", {
        error: "Client doesn’t exist",
      });

      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          status: "error",
          message: "Client doesn’t exist",
        }),
      };
    }

    // Random delay between 5000ms and 10000ms
    const getRandomDelay = () =>
      Math.floor(Math.random() * (10000 - 5000 + 1)) + 5000;

    const progressSteps = [
      { step: "Fetching Website", progress: 20, delay: getRandomDelay() },
      { step: "Analyzing Performance", progress: 40, delay: getRandomDelay() },
      { step: "Analyzing UI/UX", progress: 60, delay: getRandomDelay() },
      {
        step: "Generating Recommendations",
        progress: 80,
        delay: getRandomDelay(),
      },
    ];

    // Send progress updates if we have a connection
    async function sendProgressWithDelay() {
      for (const { step, progress, delay } of progressSteps) {
        console.log(
          `Sending progress update for ${step} with progress ${progress}`,
        );
        if (connectionId) {
          await sendProgressUpdate(
            connectionId,
            parsedEvent.endpoint,
            taskId,
            step,
            progress,
          );
          console.log(
            `Sent progress update for ${step} with progress ${progress}`,
          );
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    await sendProgressWithDelay();

    // Get analysis results for the specific URL
    const analysisResults = websiteIssues[validUrl].map((problem, index) => ({
      ...problem,
      problemId: `problem-${index + 1}`,
      timestamp: new Date().toISOString(),
    }));

    // Final update in DynamoDB with completed status and results
    const finalUpdateSuccess = await updateTaskStatus(taskId, "completed", {
      problems: analysisResults,
    });
    if (!finalUpdateSuccess) {
      throw new Error("Could not complete task - status update failed");
    }

    // Send final results through WebSocket if connected
    if (connectionId) {
      await sendMessageToClient(
        connectionId,
        {
          taskId,
          status: "completed",
          problems: analysisResults,
          step: "completed",
          progress: 100,
        },
        parsedEvent.endpoint,
      );
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskId,
        status: "completed",
        problems: analysisResults,
      }),
    };
  } catch (error) {
    console.error("Error in lambda function:", error);

    if (taskId) {
      try {
        await updateTaskStatus(taskId, "error", { error: error.message });

        if (connectionId) {
          await sendMessageToClient(
            connectionId,
            {
              taskId,
              status: "error",
              error: error.message,
              currentStep: "error",
              progress: 0,
            },
            CONFIG.WEBSOCKET_ENDPOINT.replace("wss://", "https://"),
          );
        }
      } catch (updateError) {
        console.error("Error updating task status after failure:", updateError);
      }
    }

    return {
      statusCode: error.statusCode || 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskId,
        status: "error",
        message: error.message || "Internal Server Error",
        type: error.name,
      }),
    };
  }
};
