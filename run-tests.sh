#!/bin/bash

# Run tests for all services

echo "Running tests for all services..."

# Run tests for each service
echo -e "\nTesting Ingestor Service:"
cd "$(dirname "$0")/apps/ingestor" && npm test

echo -e "\nTesting Worker Service:"
cd "$(dirname "$0")/apps/worker" && npm test

echo -e "\nTesting Dashboard Service:"
cd "$(dirname "$0")/apps/dashboard" && npm test

echo -e "\nTesting Scheduler Service:"
cd "$(dirname "$0")/apps/scheduler" && npm test

echo -e "\nAll tests completed!"