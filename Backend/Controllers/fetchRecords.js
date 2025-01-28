const AWS = require("aws-sdk");
AWS.config.update({ region: "us-east-1" });
const dynamoDB = new AWS.DynamoDB.DocumentClient();

const fetchRecords = async (req, res) => {
  const params = {
    TableName: "demoWebsiteAnalysisResults", // Replace with your table name
    FilterExpression: "#status = :completedStatus",
    ExpressionAttributeNames: {
      "#status": "status",
    },
    ExpressionAttributeValues: {
      ":completedStatus": "completed",
    },
  };

  try {
    // Scan for all completed tasks
    const data = await dynamoDB.scan(params).promise();

    // Format the response to include problems for each task
    const formattedResults = data.Items.map((item) => ({
      url: item.url,
      status: item.status,
      problems: item.problems || [], // Include an empty array if no problems
      timestamp: item.timestamp,
    }));

    res.status(200).json({
      success: true,
      data: formattedResults,
    });
  } catch (error) {
    console.error("Error fetching completed tasks:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch completed tasks",
      error: error.message,
    });
  }
};

module.exports = fetchRecords;
