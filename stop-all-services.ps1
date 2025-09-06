# Financial Risk Analyzer - Stop All Services
Write-Host "🛑 Stopping Financial Risk Analyzer services..." -ForegroundColor Red

# Stop Node.js processes
Write-Host "📊 Stopping Node.js services..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like "*ingestor*" -or $_.MainWindowTitle -like "*worker*" -or $_.MainWindowTitle -like "*dashboard*" } | Stop-Process -Force

# Alternative: Kill all node processes (more aggressive)
# Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force

# Stop Docker containers
Write-Host "🐳 Stopping Docker containers..." -ForegroundColor Yellow
docker-compose -f kafka/docker-compose.yml down
docker-compose -f db/docker-compose.yml down

Write-Host "✅ All services stopped!" -ForegroundColor Green