#!/bin/bash
set -e

# This script runs after Lambda functions are created to set up permissions

echo "Setting up Lambda invocation permissions..."

# Wait for Lambda functions to be created
echo "Waiting for Lambda functions to be created..."
sleep 20  # Wait for deploy_lambda.sh to finish

# Add permissions for Lambdas to invoke each other
# demoInitiateAnalysis can invoke demoWebsiteAnalysisFunction
awslocal lambda add-permission \
    --function-name demoWebsiteAnalysisFunction \
    --statement-id AllowInvokeFromInitiate \
    --action lambda:InvokeFunction \
    --principal lambda.amazonaws.com \
    --source-arn arn:aws:lambda:us-east-1:000000000000:function:demoInitiateAnalysis

# demoWebsiteAnalysisFunction can invoke demoAddAnalysisToDB
awslocal lambda add-permission \
    --function-name demoAddAnalysisToDB \
    --statement-id AllowInvokeFromAnalysis \
    --action lambda:InvokeFunction \
    --principal lambda.amazonaws.com \
    --source-arn arn:aws:lambda:us-east-1:000000000000:function:demoWebsiteAnalysisFunction

# demoAddAnalysisToDB can invoke demoHandleMessage
awslocal lambda add-permission \
    --function-name demoHandleMessage \
    --statement-id AllowInvokeFromDBAdd \
    --action lambda:InvokeFunction \
    --principal lambda.amazonaws.com \
    --source-arn arn:aws:lambda:us-east-1:000000000000:function:demoAddAnalysisToDB

echo "✅ Lambda permissions setup completed!"