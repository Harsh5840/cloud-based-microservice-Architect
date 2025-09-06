# Test Financial Risk Analyzer Pipeline
Write-Host "🧪 Testing Financial Risk Analyzer Pipeline..." -ForegroundColor Green

# Test 1: Check if services are running
Write-Host "`n📋 Test 1: Checking service health..." -ForegroundColor Yellow

try {
    $workerHealth = Invoke-RestMethod -Uri "http://localhost:3001/health" -Method GET -TimeoutSec 5
    Write-Host "✅ Worker service: $($workerHealth.status)" -ForegroundColor Green
} catch {
    Write-Host "❌ Worker service: Not responding" -ForegroundColor Red
}

try {
    $dashboardHealth = Invoke-RestMethod -Uri "http://localhost:3000/health" -Method GET -TimeoutSec 5
    Write-Host "✅ Dashboard service: $($dashboardHealth.status)" -ForegroundColor Green
} catch {
    Write-Host "❌ Dashboard service: Not responding" -ForegroundColor Red
}

# Test 2: Check database connection
Write-Host "`n📊 Test 2: Checking database..." -ForegroundColor Yellow
try {
    $trades = Invoke-RestMethod -Uri "http://localhost:3000/api/trades?limit=5" -Method GET -TimeoutSec 10
    Write-Host "✅ Database: Connected, found $($trades.trades.Count) trades" -ForegroundColor Green
    
    if ($trades.trades.Count -gt 0) {
        $latestTrade = $trades.trades[0]
        Write-Host "   Latest trade: $($latestTrade.trade_id) - Risk: $($latestTrade.risk_score)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "❌ Database: Connection failed or no data" -ForegroundColor Red
}

# Test 3: Check metrics
Write-Host "`n📈 Test 3: Checking metrics..." -ForegroundColor Yellow
try {
    $metrics = Invoke-RestMethod -Uri "http://localhost:3001/metrics" -Method GET -TimeoutSec 5
    if ($metrics -like "*financial_risk_processed_messages_total*") {
        Write-Host "✅ Metrics: Available" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Metrics: Available but no processed messages yet" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Metrics: Not available" -ForegroundColor Red
}

# Test 4: Check Kafka UI
Write-Host "`n🔗 Test 4: Checking Kafka UI..." -ForegroundColor Yellow
try {
    $kafkaUI = Invoke-WebRequest -Uri "http://localhost:8080" -Method GET -TimeoutSec 5
    if ($kafkaUI.StatusCode -eq 200) {
        Write-Host "✅ Kafka UI: Available at http://localhost:8080" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Kafka UI: Not available" -ForegroundColor Red
}

Write-Host "`n🎯 Pipeline Test Complete!" -ForegroundColor Green
Write-Host "💡 If any services are failing, run: .\start-all-services.ps1" -ForegroundColor Yellow