#!/bin/bash
set -e

echo "Setting up IAM role for Lambda functions..."

# Create IAM role for Lambda functions
awslocal iam create-role \
    --role-name lambda-execution-role \
    --assume-role-policy-document '{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "Service": "lambda.amazonaws.com"
                },
                "Action": "sts:AssumeRole"
            }
        ]
    }'

# Create policy document for Lambda permissions
awslocal iam create-policy \
    --policy-name lambda-permissions \
    --policy-document '{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "lambda:InvokeFunction",
                    "dynamodb:*",
                    "logs:*",
                    "execute-api:*"
                ],
                "Resource": "*"
            }
        ]
    }'

# Attach policy to role
awslocal iam attach-role-policy \
    --role-name lambda-execution-role \
    --policy-arn arn:aws:iam::000000000000:policy/lambda-permissions

echo "✅ IAM role and policy setup completed!"