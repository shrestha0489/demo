#!/bin/bash
# filepath: /Users/apple/Desktop/Spike AI/demo/Backend/setup-test.sh

# Colors for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================${NC}"
echo -e "${GREEN}Setting up test environment for Website Analysis${NC}"
echo -e "${BLUE}============================================${NC}"

# 1. Check if Docker is running
echo -e "\n${YELLOW}Checking if Docker is running...${NC}"
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}Docker is not running! Please start Docker and try again.${NC}"
  exit 1
else
  echo -e "${GREEN}✓ Docker is running${NC}"
fi

# 3. Build the project package
echo -e "\n${YELLOW}Building project package...${NC}"
if [ ! -f "./build_package.sh" ]; then
  echo -e "${RED}build_package.sh not found in current directory!${NC}"
  exit 1
fi

echo -e "${YELLOW}Running ./build_package.sh${NC}"
chmod +x ./build_package.sh
./build_package.sh

if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to build package. See errors above.${NC}"
  exit 1
else
  echo -e "${GREEN}✓ Project package built successfully${NC}"
fi

# 4. Deploy resources to LocalStack
echo -e "\n${YELLOW}Deploying required resources to LocalStack...${NC}"
if [ ! -f "./deploy_lambda.sh" ]; then
  echo -e "${RED}deploy_lambda.sh not found in current directory!${NC}"
  exit 1
fi

echo -e "${YELLOW}Running ./deploy_lambda.sh${NC}"
chmod +x ./deploy_lambda.sh
./deploy_lambda.sh

if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to deploy resources. See errors above.${NC}"
  exit 1
else
  echo -e "${GREEN}✓ Resources deployed successfully${NC}"
fi

# 5. Create required DynamoDB tables if they don't exist
echo -e "\n${YELLOW}Ensuring DynamoDB tables exist...${NC}"
docker exec localstack_dev awslocal dynamodb list-tables > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo -e "${RED}Unable to connect to DynamoDB in LocalStack!${NC}"
  exit 1
fi

# Create the demoWebsiteAnalysisResults table if it doesn't exist
if ! docker exec localstack_dev awslocal dynamodb list-tables | grep -q "demoWebsiteAnalysisResults"; then
  echo -e "${YELLOW}Creating demoWebsiteAnalysisResults table...${NC}"
  docker exec localstack_dev awslocal dynamodb create-table \
    --table-name demoWebsiteAnalysisResults \
    --attribute-definitions AttributeName=taskId,AttributeType=S \
    --key-schema AttributeName=taskId,KeyType=HASH \
    --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5
  
  if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to create DynamoDB table!${NC}"
    exit 1
  else
    echo -e "${GREEN}✓ DynamoDB table created successfully${NC}"
  fi
else
  echo -e "${GREEN}✓ DynamoDB table already exists${NC}"
fi

# 6. Run tests
echo -e "\n${YELLOW}Running tests...${NC}"
echo -e "${YELLOW}Running: ENV=localtesting npm run test:local${NC}"
ENV=localtesting npm run test:local

if [ $? -ne 0 ]; then
  echo -e "${RED}Tests failed! See errors above.${NC}"
  exit 1
else
  echo -e "${GREEN}✓ Tests completed successfully${NC}"
fi

echo -e "\n${BLUE}============================================${NC}"
echo -e "${GREEN}Test environment setup and tests completed!${NC}"
echo -e "${BLUE}============================================${NC}"

# Provide cleanup instructions
echo -e "\n${YELLOW}To clean up the test environment, run:${NC}"
echo -e "docker compose down"