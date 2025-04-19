# Backend

## Overview
This directory contains the backend services for the demo application.

## Testing the Repository

### Prerequisites
Make sure you have Docker installed and running on your machine.

### Testing Steps
1. First uncomment the following code in the `demoWebsiteAnalysisFunction`:
   ```
   await axios.post("http://host.docker.internal:3002/broadcast", {
     taskId: message.taskId,
     ...message,
   });
   ```
   and then comment out next line 
   ```
   await client.send(new PostToConnectionCommand(params));
   ```

2. Run the setup script to initialize the testing environment:

   ```
   cd scripts
   ./setup-test.sh
   ```

### Troubleshooting
If you encounter any issues during testing, check the Docker logs and ensure all services are running properly.