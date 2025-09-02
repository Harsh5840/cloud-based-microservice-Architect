#!/bin/bash

# Stop all running services

echo "Stopping all services..."

# Stop Docker Compose services
echo "Stopping Docker services..."
docker-compose -f deployment/docker-compose.yml down

# Find and stop any Node.js processes related to our services
echo "Stopping any running Node.js processes..."
pkill -f "node.*ingestor" 2>/dev/null
pkill -f "node.*worker" 2>/dev/null
pkill -f "node.*dashboard" 2>/dev/null
pkill -f "node.*scheduler" 2>/dev/null

echo "All services stopped!"