# Start all services in development mode

# Check if infrastructure services are running
$kafkaRunning = docker ps | Select-String "financial-risk-kafka"
$postgresRunning = docker ps | Select-String "financial-risk-postgres"

# Start infrastructure if not running
if (-not $kafkaRunning) {
    Write-Host "Starting Kafka..."
    docker-compose -f kafka/docker-compose.yml up -d
}

if (-not $postgresRunning) {
    Write-Host "Starting PostgreSQL..."
    docker-compose -f db/docker-compose.yml up -d
}

# Start all services in separate terminals
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd $PSScriptRoot/apps/ingestor && npm start"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd $PSScriptRoot/apps/worker && npm start"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd $PSScriptRoot/apps/dashboard && npm start"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd $PSScriptRoot/apps/scheduler && npm start"

Write-Host "All services started in development mode!"