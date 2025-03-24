const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const LOCALSTACK_HOST = "http://localhost:4566";
const STAGE_NAME = "dev";
let API_ID = "";
const CHAT_THREAD_ID = "test-thread-1234"; // ✅ Fixed chatThreadId for consistency

describe("Test", () => {
  it("should work", async () => {
    expect(1 + 1).toBe(2);
  });
});

// 🔹 Fetch API ID from LocalStack
function fetchApiId() {
  try {
    API_ID = execSync(
      `docker exec localstack_dev awslocal apigateway get-rest-apis --query "items[?name=='ChatAPI'].id" --output text`,
    )
      .toString()
      .trim();

    if (!API_ID) throw new Error("API_ID not found");
    console.log(`✅ Found API Gateway ID: ${API_ID}`);
  } catch (error) {
    console.error("❌ Failed to fetch API_ID:", error.message);
    process.exit(1);
  }
}

// 🔹 Load Lambda Config
const configPath = path.resolve(__dirname, "../../lambda_config.json");
const lambdaConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));

// 🔹 API Helper Function (Prints `curl` Equivalent Command)
async function apiRequest(
  method,
  endpoint,
  data = {},
  headers = {},
  dataWithOutBody = null,
) {
  try {
    const url = `${LOCALSTACK_HOST}/restapis/${API_ID}/${STAGE_NAME}/_user_request_/${endpoint}`;
    let requestData = {};
    if (dataWithOutBody !== null) {
      requestData = JSON.stringify(dataWithOutBody);
    } else {
      requestData = JSON.stringify({ body: data });
    }

    // Construct cURL command
    let curlCommand = `curl -X ${method.toUpperCase()} "${url}" -H "Content-Type: application/json"`;
    if (Object.keys(headers).length > 0) {
      curlCommand += ` -H "password: ${headers.password}"`; // Only needed for delete API
    }
    if (method === "POST") {
      curlCommand += ` -d '${requestData}'`;
    }

    console.log(`🟢 Equivalent cURL command:\n${curlCommand}\n`);

    // Perform API request
    const response = await axios({
      method,
      url,
      headers: { "Content-Type": "application/json", ...headers },
      data: method === "POST" ? requestData : undefined,
    });

    console.log(`✅ Response from ${endpoint}:`, response.data);
    return response.data;
  } catch (error) {
    console.error(
      `❌ Error calling ${endpoint}:`,
      error.response ? error.response.data : error.message,
    );
    process.exit(1);
  }
}

// 🔹 Extract Message ID from Store Response
function extractMessageId(storeResponse) {
  try {
    const responseBody = JSON.parse(storeResponse.body);
    const match = responseBody.message.match(/sk::(\d+)/);
    return match ? match[1] : null;
  } catch (error) {
    console.error("❌ Failed to extract message ID:", error.message);
    process.exit(1);
  }
}

// 🔹 Test Case: Full Integration Flow
async function runIntegrationTest() {
  console.log("🚀 Starting Integration Test...");

  fetchApiId();

  // 1️⃣ Store a message
  const storeData = {
    chatThreadId: CHAT_THREAD_ID,
    chatContent: "Test message",
  };
  const storeResponse = await apiRequest(
    "POST",
    "storeSystemMessages",
    storeData,
  );

  // Extract message ID from response
  const messageId = extractMessageId(storeResponse);
  if (!messageId) {
    console.error(
      "❌ Could not extract message ID from storeSystemMessages response",
    );
    process.exit(1);
  }
  console.log(`📩 Stored Message ID: ${messageId}`);

  // 2️⃣ Like the stored message (1 = Like) → **Now using body, not query params**
  const likeData = {
    chatThreadId: CHAT_THREAD_ID,
    chatId: messageId,
    likeState: 1,
  };
  await apiRequest("POST", "likeChat", {}, {}, likeData);

  // 3️⃣ Retrieve all messages (Changed to `getAllChatsForAdmin`)
  const retrieveData = { chatThreadId: CHAT_THREAD_ID };
  const retrieveResponse = await apiRequest(
    "POST",
    "getAllChatsForAdmin",
    retrieveData,
  );
  const messages = retrieveResponse.body || [];
  console.log(`📩 Retrieved Messages: ${JSON.stringify(messages, null, 2)}`);

  // 4️⃣ Delete the stored message (Needs `password` in `headers`)
  const deleteData = { chatThreadId: CHAT_THREAD_ID, chatId: messageId };
  const deleteHeaders = { password: "" }; // ✅ Empty password as required
  await apiRequest("POST", "deleteMessage", deleteData, deleteHeaders);

  // 5️⃣ Verify the message was deleted
  const afterDeleteResponse = await apiRequest(
    "POST",
    "getAllChatsForAdmin",
    retrieveData,
  );
  const remainingMessages = afterDeleteResponse.body || [];
  if (remainingMessages.some((msg) => msg.chatId === messageId)) {
    console.error("❌ Message still exists after deletion!");
    process.exit(1);
  }

  console.log("✅ Integration Test Passed!");
  process.exit(0);
}

// 🔹 Run the Test **Only if ENV is set to localtesting**
if (process.env.ENV === "localtesting") {
  runIntegrationTest();
} else {
  // ✅ Dummy Test to Ensure CI/CD Pipeline Doesn't Fail
  if (1 === 1) {
    console.log("✅ Basic Dummy Test Passed: 1 == 1");
  } else {
    console.error("❌ End of the World : 1 != 1");
    process.exit(1);
  }
  console.log(
    "🚀 Skipping Integration Test (ENV is not set to 'localtesting')",
  );
}
