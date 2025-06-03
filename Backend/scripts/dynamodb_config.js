module.exports = [
  {
    TableName: `demoWebsiteAnalysisNew`,
    KeySchema: [
      { AttributeName: "url", KeyType: "HASH" },
    ],
    AttributeDefinitions: [
      { AttributeName: "url", AttributeType: "S" },
    ],
    ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 },
  },
  {
    TableName: `demoWebsiteAnalysis`,
    KeySchema: [
      { AttributeName: "url", KeyType: "HASH" },
      { AttributeName: "taskId_connectionId", KeyType: "RANGE" },
    ],
    AttributeDefinitions: [
      { AttributeName: "url", AttributeType: "S" },
      { AttributeName: "taskId_connectionId", AttributeType: "S" },
    ],
    ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 },
  },
];
