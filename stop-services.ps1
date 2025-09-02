# Stop all running services

Write-Host "Stopping all services..."

# Stop Docker Compose services
Write-Host "Stopping Docker services..."
docker-compose -f deployment/docker-compose.yml down

# Find and stop any Node.js processes related to our services
Write-Host "Stopping any running Node.js processes..."
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*\node.exe" }

foreach ($process in $nodeProcesses) {
    $cmdLine = (Get-WmiObject Win32_Process -Filter "ProcessId = $($process.Id)").CommandLine
    if ($cmdLine -match "ingestor|worker|dashboard|scheduler") {
        Write-Host "Stopping process: $($process.Id) - $cmdLine"
        Stop-Process -Id $process.Id -Force
    }
}

Write-Host "All services stopped!"