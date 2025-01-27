const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const lambda = new AWS.Lambda(); // Lambda client

async function createTask(url, taskId) {
  const params = {
    TableName: 'WebsiteAnalysisResults',
    Item: {
      taskId,
      url,
      status: 'pending',
      timestamp: new Date().toISOString(),
    },
  };
  
  return dynamoDb.put(params).promise();
}

const analyze = async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ message: "URL is required" });
  }

  const taskId = `task-${Date.now()}`;
  await createTask(url, taskId);

  // Lambda invocation parameters
  const lambdaParams = {
    FunctionName: 'WebsiteAnalysisFunction', // Replace with your Lambda function name
    InvocationType: 'Event', // Asynchronous invocation (Event)
    Payload: JSON.stringify({ url, taskId }), // Pass URL and taskId to the Lambda
  };

  // Trigger the Lambda function asynchronously
  try {
    await lambda.invoke(lambdaParams).promise();
    console.log(`Lambda function triggered for task: ${taskId}`);
  } catch (error) {
    console.error(`Error invoking Lambda function: ${error.message}`);
  }

  res.status(200).json({ taskId });
};

module.exports = analyze;