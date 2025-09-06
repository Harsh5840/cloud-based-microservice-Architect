# Financial Risk Analyzer - Start All Services
Write-Host "🚀 Starting Financial Risk Analyzer..." -ForegroundColor Green

# Check if infrastructure is running
Write-Host "📋 Checking infrastructure..." -ForegroundColor Yellow
$kafkaRunning = docker ps --filter "name=financial-risk-kafka" --filter "status=running" -q
$dbRunning = docker ps --filter "name=financial-risk-db" --filter "status=running" -q

if (-not $kafkaRunning) {
    Write-Host "⚠️  Kafka not running. Starting infrastructure..." -ForegroundColor Yellow
    docker-compose -f kafka/docker-compose.yml up -d
    docker-compose -f db/docker-compose.yml up -d
    Write-Host "⏳ Waiting for infrastructure to be ready..." -ForegroundColor Yellow
    Start-Sleep -Seconds 30
}

# Set environment variable to suppress Kafka warning
$env:KAFKAJS_NO_PARTITIONER_WARNING = "1"

Write-Host "🔧 Starting services..." -ForegroundColor Green

# Start Worker (in background)
Write-Host "📊 Starting Worker service..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd apps/worker; npm start" -WindowStyle Normal

# Wait a bit for worker to initialize
Start-Sleep -Seconds 5

# Start Dashboard (in background)
Write-Host "🌐 Starting Dashboard service..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd apps/dashboard; npm start" -WindowStyle Normal

# Wait a bit for dashboard to initialize
Start-Sleep -Seconds 3

# Start Ingestor (in foreground so we can see the data flow)
Write-Host "📈 Starting Ingestor service..." -ForegroundColor Cyan
Write-Host "💡 This will run in foreground to show data processing..." -ForegroundColor Yellow
Write-Host "🔗 Services will be available at:" -ForegroundColor Green
Write-Host "   - Dashboard API: http://localhost:3000/api/trades" -ForegroundColor White
Write-Host "   - Worker Metrics: http://localhost:3001/metrics" -ForegroundColor White
Write-Host "   - Kafka UI: http://localhost:8080" -ForegroundColor White
Write-Host "   - PgAdmin: http://localhost:5050" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop the ingestor (other services will continue running)" -ForegroundColor Yellow
Write-Host ""

cd apps/ingestor
npm start