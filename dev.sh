#!/bin/bash

# Start all services in development mode

# Check if infrastructure services are running
kafkaRunning=$(docker ps | grep "financial-risk-kafka")
postgresRunning=$(docker ps | grep "financial-risk-postgres")

# Start infrastructure if not running
if [ -z "$kafkaRunning" ]; then
    echo "Starting Kafka..."
    docker-compose -f kafka/docker-compose.yml up -d
fi

if [ -z "$postgresRunning" ]; then
    echo "Starting PostgreSQL..."
    docker-compose -f db/docker-compose.yml up -d
fi

# Start all services in separate terminals
# This uses gnome-terminal for Linux, modify for other terminal emulators if needed
if command -v gnome-terminal &> /dev/null; then
    gnome-terminal -- bash -c "cd $(pwd)/apps/ingestor && npm start; exec bash"
    gnome-terminal -- bash -c "cd $(pwd)/apps/worker && npm start; exec bash"
    gnome-terminal -- bash -c "cd $(pwd)/apps/dashboard && npm start; exec bash"
    gnome-terminal -- bash -c "cd $(pwd)/apps/scheduler && npm start; exec bash"
# For macOS
elif command -v open &> /dev/null; then
    osascript -e 'tell app "Terminal" to do script "cd '$(pwd)'/apps/ingestor && npm start"'
    osascript -e 'tell app "Terminal" to do script "cd '$(pwd)'/apps/worker && npm start"'
    osascript -e 'tell app "Terminal" to do script "cd '$(pwd)'/apps/dashboard && npm start"'
    osascript -e 'tell app "Terminal" to do script "cd '$(pwd)'/apps/scheduler && npm start"'
else
    echo "Could not detect terminal emulator. Please start services manually:"
    echo "cd apps/ingestor && npm start"
    echo "cd apps/worker && npm start"
    echo "cd apps/dashboard && npm start"
    echo "cd apps/scheduler && npm start"
fi

echo "All services started in development mode!"