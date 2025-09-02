# Run tests for all services

Write-Host "Running tests for all services..."

# Run tests for each service
Write-Host "\nTesting Ingestor Service:"
Push-Location -Path "$PSScriptRoot\apps\ingestor"
npm test
Pop-Location

Write-Host "\nTesting Worker Service:"
Push-Location -Path "$PSScriptRoot\apps\worker"
npm test
Pop-Location

Write-Host "\nTesting Dashboard Service:"
Push-Location -Path "$PSScriptRoot\apps\dashboard"
npm test
Pop-Location

Write-Host "\nTesting Scheduler Service:"
Push-Location -Path "$PSScriptRoot\apps\scheduler"
npm test
Pop-Location

Write-Host "\nAll tests completed!"