# Quick Demo Verification Script
Write-Host "🎯 Financial Risk Analyzer - Demo Check" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green

# Check 1: Infrastructure
Write-Host "`n📋 1. Infrastructure Status:" -ForegroundColor Yellow
$containers = docker ps --filter "name=financial-risk" --format "{{.Names}} - {{.Status}}"
if ($containers) {
    $containers | ForEach-Object { Write-Host "   ✅ $_" -ForegroundColor Green }
} else {
    Write-Host "   ❌ Infrastructure not running!" -ForegroundColor Red
    Write-Host "   💡 Run: docker-compose -f kafka/docker-compose.yml up -d" -ForegroundColor Yellow
    Write-Host "   💡 Run: docker-compose -f db/docker-compose.yml up -d" -ForegroundColor Yellow
}

# Check 2: Alpha Vantage API
Write-Host "`n📈 2. Alpha Vantage API:" -ForegroundColor Yellow
$apiKey = Get-Content "apps/ingestor/.env" | Select-String "ALPHA_VANTAGE_API_KEY" | ForEach-Object { $_.ToString().Split('=')[1] }
if ($apiKey -and $apiKey -ne "") {
    Write-Host "   ✅ API Key configured: $($apiKey.Substring(0,8))..." -ForegroundColor Green
} else {
    Write-Host "   ❌ No API key found!" -ForegroundColor Red
    Write-Host "   💡 Add your key to apps/ingestor/.env" -ForegroundColor Yellow
}

# Check 3: Dependencies
Write-Host "`n📦 3. Dependencies:" -ForegroundColor Yellow
$services = @("ingestor", "worker", "dashboard", "scheduler")
foreach ($service in $services) {
    if (Test-Path "apps/$service/node_modules") {
        Write-Host "   ✅ $service dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $service dependencies missing" -ForegroundColor Red
        Write-Host "   💡 Run: cd apps/$service && npm install" -ForegroundColor Yellow
    }
}

# Check 4: Ports
Write-Host "`n🔌 4. Port Availability:" -ForegroundColor Yellow
$ports = @(3000, 3001, 5432, 8080, 9092, 29092)
foreach ($port in $ports) {
    $connection = Test-NetConnection -ComputerName localhost -Port $port -WarningAction SilentlyContinue
    if ($connection.TcpTestSucceeded) {
        Write-Host "   ✅ Port $port is available" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Port $port is not responding" -ForegroundColor Yellow
    }
}

Write-Host "`n🚀 Demo Readiness:" -ForegroundColor Green
Write-Host "   1. Start Worker:    cd apps/worker && npm start" -ForegroundColor Cyan
Write-Host "   2. Start Dashboard: cd apps/dashboard && npm start" -ForegroundColor Cyan  
Write-Host "   3. Start Ingestor:  cd apps/ingestor && npm start" -ForegroundColor Cyan
Write-Host "`n🌐 Demo URLs:" -ForegroundColor Green
Write-Host "   - API:       http://localhost:3000/api/trades" -ForegroundColor White
Write-Host "   - Metrics:   http://localhost:3001/metrics" -ForegroundColor White
Write-Host "   - Kafka UI:  http://localhost:8080" -ForegroundColor White
Write-Host "   - PgAdmin:   http://localhost:5050" -ForegroundColor White

Write-Host "`n🎯 Ready for demo! Follow DEMO_GUIDE.md" -ForegroundColor Green