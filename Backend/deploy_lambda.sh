#!/bin/bash

set -e  # Exit immediately on error
export AWS_PAGER=""  # Disable AWS CLI pager to prevent terminal hanging

# Install jq for macOS using Homebrew (without -y flag which isn't used with brew)
which jq > /dev/null || brew install jq

echo "🚀 Waiting for LocalStack to be ready..."

until curl -s http://localhost:4566/_localstack/health | grep '"lambda": "available"'; do
  echo "⏳ LocalStack is still starting..."
  sleep 5
done
echo "✅ LocalStack is ready!"

# Create DynamoDB Tables from dynamodb_config.js
echo "🛠️ Creating DynamoDB Tables from configuration file..."

# Extract table configs from dynamodb_config.js
TABLE_CONFIGS=$(node -e "
  const fs = require('fs');
  const content = fs.readFileSync('./dynamodb_config.js', 'utf8');
  const config = eval(content);
  console.log(JSON.stringify(config));
")

# Create each table from the extracted configs
for table in $(echo "$TABLE_CONFIGS" | jq -c '.[]'); do
  TABLE_NAME=$(echo $table | jq -r '.TableName')
  
  echo "Creating table: $TABLE_NAME"
  
  # Extract key schema
  KEY_SCHEMA=$(echo $table | jq '.KeySchema')
  
  # Extract attribute definitions
  ATTRIBUTE_DEFINITIONS=$(echo $table | jq '.AttributeDefinitions')
  
  # Create the table
  aws --endpoint-url=http://localhost:4566 --no-cli-pager dynamodb create-table \
    --table-name "$TABLE_NAME" \
    --attribute-definitions "$ATTRIBUTE_DEFINITIONS" \
    --key-schema "$KEY_SCHEMA" \
    --billing-mode PAY_PER_REQUEST
    
  echo "✅ Table $TABLE_NAME created successfully"
done

# Read Lambda configurations from JSON
LAMBDA_CONFIG_FILE="lambda_config.json"

if [[ ! -f "$LAMBDA_CONFIG_FILE" ]]; then
  echo "❌ Lambda configuration file '$LAMBDA_CONFIG_FILE' not found!"
  exit 1
fi

# Check if demo.zip exists
if [[ ! -f "demo.zip" ]]; then
  echo "❌ Lambda function package 'demo.zip' not found!"
  exit 1
fi

# Deploy all Lambda functions
echo "🚀 Deploying Lambda functions..."

for row in $(jq -c '.[]' "$LAMBDA_CONFIG_FILE"); do
  LAMBDA_NAME=$(echo $row | jq -r '.name')
  HANDLER_PATH=$(echo $row | jq -r '.handler')
  
  echo "🛠️ Deploying Lambda: $LAMBDA_NAME with handler $HANDLER_PATH"
  
  aws --endpoint-url=http://localhost:4566 --no-cli-pager lambda create-function \
      --function-name "$LAMBDA_NAME" \
      --runtime nodejs18.x \
      --role arn:aws:iam::000000000000:role/lambda-execution-role \
      --handler "$HANDLER_PATH" \
      --zip-file fileb://demo.zip \
      --timeout 600 \
      --environment "Variables={CONNECTIONS_TABLE=demoWebsiteAnalysisResults,ANALYSIS_TABLE=demoWebsiteAnalysisResults,WEBSITE_ANALYSIS_TABLE=demoWebsiteAnalysis,API_ENDPOINT=http://localhost:4566}" \
      || { echo "Error deploying Lambda: $LAMBDA_NAME"; exit 1; }
done

echo "✅ Deployment completed."

# Setup REST API Gateway (instead of WebSocket)
echo "🌐 Setting up REST API Gateway..."
REST_API_ID=$(aws --endpoint-url=http://localhost:4566 --no-cli-pager apigateway create-rest-api \
    --name "WebsiteAnalysisRESTAPI" \
    --query 'id' --output text)

echo "✅ Created REST API with ID: $REST_API_ID"

# Get the root resource ID
ROOT_RESOURCE_ID=$(aws --endpoint-url=http://localhost:4566 --no-cli-pager apigateway get-resources \
    --rest-api-id $REST_API_ID \
    --query 'items[0].id' --output text)

# Create necessary resources and methods for our API
echo "Creating API resources and methods..."

# Create '/analysis' resource
ANALYSIS_RESOURCE_ID=$(aws --endpoint-url=http://localhost:4566 --no-cli-pager apigateway create-resource \
    --rest-api-id $REST_API_ID \
    --parent-id $ROOT_RESOURCE_ID \
    --path-part "analysis" \
    --query 'id' --output text)

# Create '/subscribe' resource
SUBSCRIBE_RESOURCE_ID=$(aws --endpoint-url=http://localhost:4566 --no-cli-pager apigateway create-resource \
    --rest-api-id $REST_API_ID \
    --parent-id $ROOT_RESOURCE_ID \
    --path-part "subscribe" \
    --query 'id' --output text)

# Create '/status' resource
STATUS_RESOURCE_ID=$(aws --endpoint-url=http://localhost:4566 --no-cli-pager apigateway create-resource \
    --rest-api-id $REST_API_ID \
    --parent-id $ROOT_RESOURCE_ID \
    --path-part "status" \
    --query 'id' --output text)

# Setup method for /analysis
aws --endpoint-url=http://localhost:4566 --no-cli-pager apigateway put-method \
    --rest-api-id $REST_API_ID \
    --resource-id $ANALYSIS_RESOURCE_ID \
    --http-method POST \
    --authorization-type NONE \
    --no-api-key-required

# Setup method for /subscribe
aws --endpoint-url=http://localhost:4566 --no-cli-pager apigateway put-method \
    --rest-api-id $REST_API_ID \
    --resource-id $SUBSCRIBE_RESOURCE_ID \
    --http-method POST \
    --authorization-type NONE \
    --no-api-key-required

# Setup method for /status
aws --endpoint-url=http://localhost:4566 --no-cli-pager apigateway put-method \
    --rest-api-id $REST_API_ID \
    --resource-id $STATUS_RESOURCE_ID \
    --http-method GET \
    --authorization-type NONE \
    --no-api-key-required

# Setup Lambda integrations
echo "🔌 Setting up Lambda integrations for API endpoints..."

# Integration for /analysis with demoInitiateAnalysis Lambda
aws --endpoint-url=http://localhost:4566 --no-cli-pager apigateway put-integration \
    --rest-api-id $REST_API_ID \
    --resource-id $ANALYSIS_RESOURCE_ID \
    --http-method POST \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:000000000000:function:demoInitiateAnalysis/invocations"

# Integration for /subscribe with demoHandleMessage Lambda
aws --endpoint-url=http://localhost:4566 --no-cli-pager apigateway put-integration \
    --rest-api-id $REST_API_ID \
    --resource-id $SUBSCRIBE_RESOURCE_ID \
    --http-method POST \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:000000000000:function:demoHandleMessage/invocations"

# Integration for /status with demoWebsiteAnalysisFunction Lambda for status checks
aws --endpoint-url=http://localhost:4566 --no-cli-pager apigateway put-integration \
    --rest-api-id $REST_API_ID \
    --resource-id $STATUS_RESOURCE_ID \
    --http-method GET \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:000000000000:function:demoWebsiteAnalysisFunction/invocations"

# Setup method responses (200 OK)
aws --endpoint-url=http://localhost:4566 --no-cli-pager apigateway put-method-response \
    --rest-api-id $REST_API_ID \
    --resource-id $ANALYSIS_RESOURCE_ID \
    --http-method POST \
    --status-code 200

aws --endpoint-url=http://localhost:4566 --no-cli-pager apigateway put-method-response \
    --rest-api-id $REST_API_ID \
    --resource-id $SUBSCRIBE_RESOURCE_ID \
    --http-method POST \
    --status-code 200

aws --endpoint-url=http://localhost:4566 --no-cli-pager apigateway put-method-response \
    --rest-api-id $REST_API_ID \
    --resource-id $STATUS_RESOURCE_ID \
    --http-method GET \
    --status-code 200

# Setup integration responses
aws --endpoint-url=http://localhost:4566 --no-cli-pager apigateway put-integration-response \
    --rest-api-id $REST_API_ID \
    --resource-id $ANALYSIS_RESOURCE_ID \
    --http-method POST \
    --status-code 200 \
    --selection-pattern ""

aws --endpoint-url=http://localhost:4566 --no-cli-pager apigateway put-integration-response \
    --rest-api-id $REST_API_ID \
    --resource-id $SUBSCRIBE_RESOURCE_ID \
    --http-method POST \
    --status-code 200 \
    --selection-pattern ""

aws --endpoint-url=http://localhost:4566 --no-cli-pager apigateway put-integration-response \
    --rest-api-id $REST_API_ID \
    --resource-id $STATUS_RESOURCE_ID \
    --http-method GET \
    --status-code 200 \
    --selection-pattern ""

# Grant permissions for API Gateway to invoke Lambda functions
echo "Granting API Gateway permissions to invoke Lambda functions..."

aws --endpoint-url=http://localhost:4566 --no-cli-pager lambda add-permission \
    --function-name "demoInitiateAnalysis" \
    --statement-id "AllowAPIGatewayAnalysis" \
    --action "lambda:InvokeFunction" \
    --principal "apigateway.amazonaws.com" \
    --source-arn "arn:aws:execute-api:us-east-1:000000000000:$REST_API_ID/*/POST/analysis"

aws --endpoint-url=http://localhost:4566 --no-cli-pager lambda add-permission \
    --function-name "demoHandleMessage" \
    --statement-id "AllowAPIGatewaySubscribe" \
    --action "lambda:InvokeFunction" \
    --principal "apigateway.amazonaws.com" \
    --source-arn "arn:aws:execute-api:us-east-1:000000000000:$REST_API_ID/*/POST/subscribe"

aws --endpoint-url=http://localhost:4566 --no-cli-pager lambda add-permission \
    --function-name "demoWebsiteAnalysisFunction" \
    --statement-id "AllowAPIGatewayStatus" \
    --action "lambda:InvokeFunction" \
    --principal "apigateway.amazonaws.com" \
    --source-arn "arn:aws:execute-api:us-east-1:000000000000:$REST_API_ID/*/GET/status"

# Deploy the REST API
echo "🚀 Deploying REST API..."
DEPLOYMENT_ID=$(aws --endpoint-url=http://localhost:4566 --no-cli-pager apigateway create-deployment \
    --rest-api-id $REST_API_ID \
    --stage-name prod \
    --query 'id' --output text)

# Enable CORS for all resources
echo "Enabling CORS for API resources..."
for RESOURCE_ID in $ANALYSIS_RESOURCE_ID $SUBSCRIBE_RESOURCE_ID $STATUS_RESOURCE_ID; do
    aws --endpoint-url=http://localhost:4566 --no-cli-pager apigateway put-method \
        --rest-api-id $REST_API_ID \
        --resource-id $RESOURCE_ID \
        --http-method OPTIONS \
        --authorization-type NONE \
        --no-api-key-required
        
    aws --endpoint-url=http://localhost:4566 --no-cli-pager apigateway put-method-response \
        --rest-api-id $REST_API_ID \
        --resource-id $RESOURCE_ID \
        --http-method OPTIONS \
        --status-code 200 \
        --response-parameters "method.response.header.Access-Control-Allow-Origin=true,method.response.header.Access-Control-Allow-Methods=true,method.response.header.Access-Control-Allow-Headers=true"
        
    aws --endpoint-url=http://localhost:4566 --no-cli-pager apigateway put-integration \
        --rest-api-id $REST_API_ID \
        --resource-id $RESOURCE_ID \
        --http-method OPTIONS \
        --type MOCK \
        --integration-http-method OPTIONS \
        --request-templates '{"application/json": "{\"statusCode\": 200}"}'
        
    aws --endpoint-url=http://localhost:4566 --no-cli-pager apigateway put-integration-response \
        --rest-api-id $REST_API_ID \
        --resource-id $RESOURCE_ID \
        --http-method OPTIONS \
        --status-code 200 \
        --response-parameters "method.response.header.Access-Control-Allow-Origin='*',method.response.header.Access-Control-Allow-Methods='GET,POST,OPTIONS',method.response.header.Access-Control-Allow-Headers='Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'" \
        --selection-pattern ""
done

# Create another deployment after CORS setup
echo "Creating final deployment with CORS enabled..."
FINAL_DEPLOYMENT_ID=$(aws --endpoint-url=http://localhost:4566 --no-cli-pager apigateway create-deployment \
    --rest-api-id $REST_API_ID \
    --stage-name prod \
    --query 'id' --output text)

# Construct the base API URL
API_URL="http://localhost:4566/restapis/$REST_API_ID/prod/_user_request_"
echo "🌐 REST API URL: $API_URL"

# Seed the WEBSITE_ANALYSIS_TABLE with sample data
echo "🌱 Seeding WEBSITE_ANALYSIS_TABLE with sample data..."

# Add sample entries to the WEBSITE_ANALYSIS_TABLE
aws --endpoint-url=http://localhost:4566 --no-cli-pager dynamodb put-item \
    --table-name demoWebsiteAnalysis \
    --item '{
        "url": {"S": "getgsi.com"},
        "problems": {"L": [
            {"M": {
                "problemDescription": {"S": "Sample problem description for getgsi.com"},
                "solutionText": {"S": "Sample solution text for getgsi.com"},
                "impactText": {"S": "Sample impact text for getgsi.com"}
            }}
        ]}
    }'

aws --endpoint-url=http://localhost:4566 --no-cli-pager dynamodb put-item \
    --table-name demoWebsiteAnalysis \
    --item '{
        "url": {"S": "squadcast.com"},
        "problems": {"L": [
            {"M": {
                "problemDescription": {"S": "Sample problem description for squadcast.com"},
                "solutionText": {"S": "Sample solution text for squadcast.com"},
                "impactText": {"S": "Sample impact text for squadcast.com"}
            }}
        ]}
    }'

# Add a sample task to the CONNECTIONS_TABLE/ANALYSIS_TABLE
aws --endpoint-url=http://localhost:4566 --no-cli-pager dynamodb put-item \
    --table-name demoWebsiteAnalysisResults \
    --item '{
        "taskId": {"S": "task123"},
        "status": {"S": "COMPLETED"},
        "data": {"M": {
            "url": {"S": "getgsi.com"},
            "analysisResults": {"L": [
                {"M": {
                    "problemDescription": {"S": "Sample problem from task123"},
                    "solutionText": {"S": "Sample solution from task123"},
                    "impactText": {"S": "Sample impact from task123"}
                }}
            ]}
        }}
    }'

echo "✅ Deployment Complete! System is ready for testing."

# Display useful information
echo "🔍 Table Information:"
echo "  - CONNECTIONS_TABLE: demoWebsiteAnalysisResults (partition key: taskId)"
echo "  - ANALYSIS_TABLE: demoWebsiteAnalysisResults (same table, partition key: taskId)"
echo "  - WEBSITE_ANALYSIS_TABLE: demoWebsiteAnalysis (partition key: url)"
echo ""
echo "🔗 REST API Endpoints:"
echo "  - Start Analysis: $API_URL/analysis"
echo "  - Subscribe to Updates: $API_URL/subscribe"
echo "  - Check Status: $API_URL/status"
echo ""
echo "🧪 To test the API, you can use curl:"
echo "  $ curl -X POST $API_URL/analysis -H 'Content-Type: application/json' -d '{\"url\":\"getgsi.com\"}'"
echo "  $ curl -X POST $API_URL/subscribe -H 'Content-Type: application/json' -d '{\"taskId\":\"task123\"}'"
echo "  $ curl -X GET $API_URL/status?taskId=task123"
echo ""
echo "Note: Instead of WebSockets, you'll need to poll the status endpoint to check task progress."