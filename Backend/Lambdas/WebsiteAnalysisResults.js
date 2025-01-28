import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  UpdateCommand,
  GetCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";

// Configuration of endpoints
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
const problems = [
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
];

const delay = (attempt) => {
  const backoff = Math.min(CONFIG.RETRY_DELAY * Math.pow(2, attempt), 5000);
  return new Promise((resolve) => setTimeout(resolve, backoff));
};

// function to find WebSocket connection for a taskId
async function findConnectionIdForTask(taskId) {
  // doing multiple tries as the info that is being saved as a pair in another lambda might take some time to reflect
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
        error
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
        : event.body || event; // info is being recieved as string format, for cross platform compatibility

    if (!payload.url || !payload.taskId) {
      throw new Error("URL and taskId are required in the payload");
    }

    const endpoint = CONFIG.WEBSOCKET_ENDPOINT;
    return {
      url: payload.url,
      taskId: payload.taskId,
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
      "Skipping WebSocket message - missing connectionId or endpoint"
    );
    return;
  }

  const client = new ApiGatewayManagementApiClient({
    // setting up a client to send the results to the users connectiong to api gateway (websocket)
    endpoint: endpoint,
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
    await client.send(new PostToConnectionCommand(params)); // sending the results to the user for a connectionId
    console.log(`Message sent to connection: ${connectionId}`);
  } catch (error) {
    if (error.name === "GoneException") {
      console.log(`Connection ${connectionId} is no longer available`);
      return;
    }
    console.error(
      `Error sending message to connection ${connectionId}:`,
      error
    );
    throw error;
  }
};

// function to update task status in DynamoDB
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
    TableName: "demoWebsiteAnalysisResults",
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

// function to send progress update, for loader mainly
export const sendProgressUpdate = async (
  connectionId,
  endpoint,
  taskId,
  currentStep,
  progress
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
      endpoint
    );
  } catch (error) {
    console.warn(`Failed to send progress update for task ${taskId}:`, error);
    // Continue execution - progress updates are non-critical
  }
};

// Lambda handler, main function
export const handler = async (event) => {
  let taskId;
  let connectionId;

  try {
    console.log(
      "Lambda invocation with event:",
      JSON.stringify(event, null, 2)
    );
    const parsedEvent = parseEvent(event); // parse incoming info, to take out url and taskId
    taskId = parsedEvent.taskId;

    // Find the associated WebSocket connection for incoming taskId
    connectionId = await findConnectionIdForTask(taskId);
    console.log(`Found connectionId ${connectionId} for taskId ${taskId}`);

    // Send progress updates
    const progressSteps = [
      { step: "Fetching Website", progress: 20, delay: 5000 }, // 5 seconds
      { step: "Analyzing Performance", progress: 40, delay: 10000 }, // 10 seconds
      { step: "Analyzing UI/UX", progress: 60, delay: 10000 }, // 10 seconds
      { step: "Generating Recommendations", progress: 80, delay: 15000 }, // 15 seconds
    ];

    async function sendProgressWithDelay() {
      for (const { step, progress, delay } of progressSteps) {
        console.log(
          `Sending progress update for ${step} with progress ${progress}`
        );
        if (connectionId) {
          await sendProgressUpdate(
            connectionId,
            parsedEvent.endpoint,
            taskId,
            step,
            progress
          );
          console.log(
            `Sent progress update for ${step} with progress ${progress}`
          );
        }
        await new Promise((resolve) => setTimeout(resolve, delay)); // here adding the delay
      }
    }

    await sendProgressWithDelay();

    // Analyze website and prepare results, giving proper structure to save it in the db
    const analysisResults = problems.map((problem, index) => ({
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
        parsedEvent.endpoint
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
            CONFIG.WEBSOCKET_ENDPOINT.replace("wss://", "https://")
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
