import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { mySQLQueryExecuteUsingPromise } from "./RDSConnector.js";
import { escapeSQL, extractBaseDomain, normalizeUrl } from "./utils.js";

// Configuration from environment variables
const CONFIG = {
  WEBSOCKET_ENDPOINT:
    process.env.WEBSOCKET_ENDPOINT ||
    "wss://he7ifebjve.execute-api.us-east-1.amazonaws.com/production/",
  MAX_RETRIES: parseInt(process.env.MAX_RETRIES || "20"),
  RETRY_DELAY: parseInt(process.env.RETRY_DELAY || "20"),
  CONNECTIONS_TABLE:
    process.env.CONNECTIONS_TABLE || "demoWebsiteAnalysis",
  MYSQL_DB_URL: process.env.MYSQL_DB_URL || "proxy-1716514837539-spike-backend-database.proxy-co6sfcmgwmt8.us-east-1.rds.amazonaws.com",
  MYSQL_DB_USER_NAME: process.env.MYSQL_DB_USER_NAME || "app_user",
  MYSQL_DB_NAME: process.env.MYSQL_DB_NAME || "spike_backend",
  MYSQL_DB_PORT: process.env.MYSQL_DB_PORT || "3306",
  MYSQL_DB_PASSWORD: process.env.MYSQL_DB_PASSWORD || "password",
};

// Initialize DynamoDB clients (only for WebSocket connections)
const client = new DynamoDBClient({});
const dynamoDb = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});


async function fetchWebsiteAnalysis(url) {
  try {
    const fullUrl = normalizeUrl(url);
    const domainUrl = extractBaseDomain(fullUrl);
    
    console.log(`Fetching analysis for domain: ${domainUrl}`);
    
    // Step 1: Fetch all problems for the domain
    const problemsQuery = `SELECT id, descr, solution, impact, theme, domain_url, created_at 
                          FROM problem
                          WHERE domain_url = '${escapeSQL(domainUrl)}'`;
    
    const problems = await mySQLQueryExecuteUsingPromise(problemsQuery);
    
    if (!problems || problems.length === 0) {
      console.log(`No problems found for domain: ${domainUrl}`);
      return null;
    }
    
    // Extract all problem IDs
    const problemIds = problems.map(problem => problem.id);
    
    // Step 2: Fetch all experiments for these problems in a single query
    const experimentsQuery = `SELECT id, name, problem_id, start_date, end_date, created_at 
                            FROM experiments 
                            WHERE problem_id IN (${problemIds.join(',')})`;
    
    const experiments = await mySQLQueryExecuteUsingPromise(experimentsQuery);
    
    // Create a map of experiments by problem_id
    const experimentsByProblem = new Map();
    const experimentIds = [];
    
    experiments.forEach(experiment => {
      experimentIds.push(experiment.id);
      
      if (!experimentsByProblem.has(experiment.problem_id)) {
        experimentsByProblem.set(experiment.problem_id, []);
      }
      
      experimentsByProblem.get(experiment.problem_id).push(experiment);
    });
    
    // Step 3: Fetch all variants for these experiments in a single query
    const variantsQuery = `SELECT id, name, experiment_id, status, created_at 
                         FROM variants 
                         WHERE experiment_id IN (${experimentIds.length > 0 ? experimentIds.join(',') : '0'})`;
    
    const variants = await mySQLQueryExecuteUsingPromise(variantsQuery);
    
    // Create a map of variants by experiment_id
    const variantsByExperiment = new Map();
    const variantIds = [];
    
    variants.forEach(variant => {
      variantIds.push(variant.id);
      
      if (!variantsByExperiment.has(variant.experiment_id)) {
        variantsByExperiment.set(variant.experiment_id, []);
      }
      
      variantsByExperiment.get(variant.experiment_id).push(variant);
    });
    
    // Step 4: Fetch all changes for these variants in a single query
    const changesQuery = `SELECT id, selector, html, script, placement, webpage_url, variant_id, created_at 
                        FROM changes 
                        WHERE variant_id IN (${variantIds.length > 0 ? variantIds.join(',') : '0'})`;
    
    const changes = await mySQLQueryExecuteUsingPromise(changesQuery);
    
    // Create a map of changes by variant_id
    const changesByVariant = new Map();
    
    changes.forEach(change => {
      if (!changesByVariant.has(change.variant_id)) {
        changesByVariant.set(change.variant_id, []);
      }
      
      changesByVariant.get(change.variant_id).push(change);
    });
    
    // Format the data in a hierarchical structure
    const results = [];
    
    for (const problem of problems) {
      const problemData = {
        problemDescription: problem.descr,
        solutionText: problem.solution,
        impactText: problem.impact,
        theme: problem.theme,
        experiments: []
      };
      
      // Add experiments for this problem
      const problemExperiments = experimentsByProblem.get(problem.id) || [];
      
      for (const experiment of problemExperiments) {
        const experimentData = {
          name: experiment.name,
          startDate: experiment.start_date,
          endDate: experiment.end_date,
          variants: []
        };
        
        // Add variants for this experiment
        const experimentVariants = variantsByExperiment.get(experiment.id) || [];
        
        for (const variant of experimentVariants) {
          const variantData = {
            name: variant.name,
            status: variant.status,
            changes: []
          };
          
          // Add changes for this variant
          const variantChanges = changesByVariant.get(variant.id) || [];
          
          for (const change of variantChanges) {
            variantData.changes.push({
              selector: change.selector,
              html: change.html,
              script: change.script,
              placement: change.placement,
              webpageUrl: change.webpage_url
            });
          }
          
          experimentData.variants.push(variantData);
        }
        
        problemData.experiments.push(experimentData);
      }
      
      results.push(problemData);
    }

    // Format in the expected structure - domainUrl as key, results as value
    const analysis = {};
    analysis[domainUrl] = results;
    
    console.log(`Found ${results.length} problems for domain: ${domainUrl}`);
    return analysis;
    
  } catch (error) {
    console.error(`Error fetching analysis from RDS for URL ${url}:`, error);
    throw error;
  }
}

// Helper function to validate if URL exists in our database
const validateUrl = async (url) => {
  try {
    const fullUrl = normalizeUrl(url);
    const domainUrl = extractBaseDomain(fullUrl);
    
    // Check if domain exists in the database
    const query = `SELECT COUNT(*) as count FROM problem WHERE domain_url = '${escapeSQL(domainUrl)}'`;
    const result = await mySQLQueryExecuteUsingPromise(query);
    
    return result[0].count > 0 ? domainUrl : null;
  } catch (error) {
    console.error(`Error validating URL ${url}:`, error);
    return null;
  }
};

// Function to find WebSocket connection for a taskId with exponential backoff
async function findConnectionIdForTask(taskId, url) {
  // Configuration for retry strategy
  const initialDelay = 100; // Start with 100ms delay
  const maxDelay = 5000; // Maximum delay of 5 seconds
  const maxAttempts = CONFIG.MAX_RETRIES || 3;
  let currentDelay = initialDelay;

  console.log(`Starting to look for connectionId for url: ${url}, taskId: ${taskId}`);
  console.log(
    `Will attempt ${maxAttempts} times with delays between ${initialDelay}ms and ${maxDelay}ms`,
  );

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const params = {
        TableName: CONFIG.CONNECTIONS_TABLE,
        KeyConditionExpression: "#urlAttr = :url AND begins_with(taskId_connectionId, :taskIdPrefix)",
        ExpressionAttributeNames: {
          "#urlAttr": "url"
        },
        ExpressionAttributeValues: {
          ":url": url,
          ":taskIdPrefix": `${taskId}$$$`
        },
        ConsistentRead: true,
      };

      console.log(
        `Attempt ${attempt + 1}/${maxAttempts} to find connectionId...`,
      );
      const result = await dynamoDb.send(new QueryCommand(params));
      console.log("result: ", result);

      if (result.Items && result.Items.length > 0) {
        // Extract connectionId from the composite sort key (taskId$$$connectionId)
        const sk = result.Items[0].taskId_connectionId;
        const connectionId = sk.split('$$$')[1];

        if (connectionId && connectionId !== taskId) {
          console.log(
            `Successfully found connectionId: ${connectionId} for url: ${url}, taskId: ${taskId}`,
          );
          return connectionId;
        }
      }

      // No connection found, prepare for retry
      console.log(
        `No connection found for url: ${url}, taskId: ${taskId} on attempt ${attempt + 1}`,
      );

      if (attempt < maxAttempts - 1) {
        // Calculate next delay with exponential backoff and jitter
        currentDelay = Math.min(currentDelay * 2, maxDelay);
        const jitter = Math.random() * 0.3 * currentDelay; // Add up to 30% random jitter
        const totalDelay = currentDelay + jitter;

        console.log(
          `Waiting ${Math.round(totalDelay)}ms before next attempt...`,
        );
        await new Promise((resolve) => setTimeout(resolve, totalDelay));
      }
    } catch (error) {
      console.error(
        `Error querying DynamoDB for url: ${url}, taskId: ${taskId} (attempt ${attempt + 1}):`,
        error,
      );

      if (attempt < maxAttempts - 1) {
        currentDelay = Math.min(currentDelay * 2, maxDelay);
        const jitter = Math.random() * 0.3 * currentDelay;
        const totalDelay = currentDelay + jitter;

        console.log(
          `Error occurred, waiting ${Math.round(totalDelay)}ms before retry...`,
        );
        await new Promise((resolve) => setTimeout(resolve, totalDelay));
      }
    }
  }

  console.log(
    `Failed to find connectionId for url: ${url}, taskId: ${taskId} after ${maxAttempts} attempts`,
  );
  throw new Error(
    `Unable to find connectionId for url: ${url}, taskId: ${taskId} after ${maxAttempts} attempts`,
  );
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
    // await axios.post("http://host.docker.internal:3002/broadcast", {
    //   taskId: message.taskId,
    //   ...message,
    // });
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
export const updateTaskStatus = async (url, connectionId, taskId, status, data = {}) => {
  console.log("Updating task status in DynamoDB:", url, taskId, connectionId, status, data);

  const timestamp = new Date().toISOString();
  const sortKey = `${taskId}$$$${connectionId}`;
  
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
    Key: { 
      url: url,
      taskId_connectionId: sortKey
    },
    UpdateExpression: updateExpression.join(", "),
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
  };

  try {
    await dynamoDb.send(new UpdateCommand(params));
    console.log(`Task ${taskId} for URL ${url} updated successfully in DynamoDB`);
    return true;
  } catch (error) {
    console.error(`Error updating task status in DynamoDB for URL ${url}, taskId ${taskId}:`, error);
    throw error;
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
export const demoWebsiteAnalysisFunction = async (event) => {
  let taskId, connectionId, url;

  try {
    console.log(
      "Lambda invocation with event:",
      JSON.stringify(event, null, 2),
    );
    const parsedEvent = parseEvent(event);
    taskId = parsedEvent.taskId;
    url = parsedEvent.url;

    // Find the associated WebSocket connection
    connectionId = await findConnectionIdForTask(taskId, url);
    console.log(`Found connectionId ${connectionId} for taskId ${taskId}`);

    // Validate URL
    const validUrl = await validateUrl(url);
    if (!validUrl) {
      // Send error message through WebSocket if URL doesn't exist
      if (connectionId) {
        await sendMessageToClient(
          connectionId,
          {
            taskId,
            status: "error",
            error: "Client doesn't exist",
            currentStep: "validation",
            progress: 0,
          },
          parsedEvent.endpoint,
        );
      }

      // Update task status to error
      await updateTaskStatus(url,connectionId,taskId, "error", {
        error: "Client doesn't exist",
      });

      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          status: "error",
          message: "Client doesn't exist",
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

    // Fetch analysis results from MySQL
    console.log(`Fetching analysis from MySQL database for ${url}`);
    const dbWebsiteIssues = await fetchWebsiteAnalysis(url);

    if (!dbWebsiteIssues || !dbWebsiteIssues[validUrl]) {
      throw new Error(`No analysis data found for URL: ${validUrl}`);
    }

    const analysisResults = dbWebsiteIssues[validUrl];

    // Send final results through WebSocket if connected
    if (connectionId) {
      await sendMessageToClient(
        connectionId,
        {
          taskId,
          status: "completed",
          url: validUrl,
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
        url: validUrl,
        problems: analysisResults,
      }),
    };
  } catch (error) {
    console.error("Error in lambda function:", error);

    if (connectionId) {
      try {
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
      } catch (updateError) {
        console.error("Error sending error status via WebSocket:", updateError);
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