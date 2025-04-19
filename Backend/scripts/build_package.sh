#!/bin/bash

set -e  # Exit immediately on error
LOCALSTACK_CONTAINER="localstack_dev"

# 🛑 Check if LocalStack is running
if docker ps --format '{{.Names}}' | grep -q "$LOCALSTACK_CONTAINER"; then
  echo "⚠️ LocalStack ($LOCALSTACK_CONTAINER) is already running. Stopping it..."
  docker compose down
  echo "✅ LocalStack has been stopped."
else
  echo "ℹ️ LocalStack is not running. Proceeding with the build."
fi
echo "🚀 Removing old ZIP file (if exists)..."
rm -rf demo.zip

echo "🚀 Building Lambda deployment package..."

cd ..
# Ensure dependencies are installed
npm install

# Create ZIP package
zip -r demo.zip .

echo "✅ Package created: demo.zip"

cd scripts
echo "🚀 Deploying Compose..."

# Start Docker Compose
docker compose up -d