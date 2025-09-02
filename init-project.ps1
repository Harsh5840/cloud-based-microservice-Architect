# Create .env file from example if it doesn't exist
if (-not (Test-Path -Path ".env")) {
    Write-Host "Creating .env file from .env.example..."
    Copy-Item -Path ".env.example" -Destination ".env"
}

# Install dependencies for all services
Write-Host "Installing dependencies for all services..."
npm install

# Create data directory for sample datasets
Write-Host "Creating data directory for sample datasets..."
New-Item -ItemType Directory -Force -Path "data"

# Create sample financial datasets
Write-Host "Creating sample financial datasets..."
$dataset1 = @"
[
  {
    "trade_id": "T123456",
    "timestamp": "$(Get-Date (Get-Date).AddHours(-1) -Format o)",
    "symbol": "AAPL",
    "price": 150.25,
    "volume": 1000,
    "volatility": 0.15,
    "market_sentiment": 0.7
  },
  {
    "trade_id": "T123457",
    "timestamp": "$(Get-Date (Get-Date).AddMinutes(-45) -Format o)",
    "symbol": "MSFT",
    "price": 290.50,
    "volume": 500,
    "volatility": 0.12,
    "market_sentiment": 0.8
  }
]
"@

$dataset2 = @"
[
  {
    "trade_id": "T123458",
    "timestamp": "$(Get-Date (Get-Date).AddMinutes(-30) -Format o)",
    "symbol": "GOOGL",
    "price": 2750.10,
    "volume": 300,
    "volatility": 0.18,
    "market_sentiment": 0.65
  },
  {
    "trade_id": "T123459",
    "timestamp": "$(Get-Date (Get-Date).AddMinutes(-15) -Format o)",
    "symbol": "AMZN",
    "price": 3300.75,
    "volume": 200,
    "volatility": 0.20,
    "market_sentiment": 0.75
  }
]
"@

Set-Content -Path "data\financial_dataset_1.json" -Value $dataset1
Set-Content -Path "data\financial_dataset_2.json" -Value $dataset2

Write-Host "Project initialization complete!"
Write-Host "Run 'docker-compose up' to start all services."