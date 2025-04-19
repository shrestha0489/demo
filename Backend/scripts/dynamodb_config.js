module.exports = [
  {
    TableName: `demoWebsiteAnalysisResults`,
    KeySchema: [
      { AttributeName: "taskId", KeyType: "HASH" },
    ],
    AttributeDefinitions: [
      { AttributeName: "taskId", AttributeType: "S" },
    ],
    ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 },
  },
  {
    TableName: `demoWebsiteAnalysis`,
    KeySchema: [
      { AttributeName: "url", KeyType: "HASH" },
    ],
    AttributeDefinitions: [
      { AttributeName: "url", AttributeType: "S" },
    ],
    ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 },
  },
];
