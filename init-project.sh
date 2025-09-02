#!/bin/bash

# Create .env file from example if it doesn't exist
if [ ! -f .env ]; then
  echo "Creating .env file from .env.example..."
  cp .env.example .env
fi

# Install dependencies for all services
echo "Installing dependencies for all services..."
npm install

# Create data directory for sample datasets
echo "Creating data directory for sample datasets..."
mkdir -p data

# Create sample financial datasets
echo "Creating sample financial datasets..."
cat > data/financial_dataset_1.json << EOL
[
  {
    "trade_id": "T123456",
    "timestamp": "$(date -d "1 hour ago" +%Y-%m-%dT%H:%M:%S.%3NZ)",
    "symbol": "AAPL",
    "price": 150.25,
    "volume": 1000,
    "volatility": 0.15,
    "market_sentiment": 0.7
  },
  {
    "trade_id": "T123457",
    "timestamp": "$(date -d "45 minutes ago" +%Y-%m-%dT%H:%M:%S.%3NZ)",
    "symbol": "MSFT",
    "price": 290.50,
    "volume": 500,
    "volatility": 0.12,
    "market_sentiment": 0.8
  }
]
EOL

cat > data/financial_dataset_2.json << EOL
[
  {
    "trade_id": "T123458",
    "timestamp": "$(date -d "30 minutes ago" +%Y-%m-%dT%H:%M:%S.%3NZ)",
    "symbol": "GOOGL",
    "price": 2750.10,
    "volume": 300,
    "volatility": 0.18,
    "market_sentiment": 0.65
  },
  {
    "trade_id": "T123459",
    "timestamp": "$(date -d "15 minutes ago" +%Y-%m-%dT%H:%M:%S.%3NZ)",
    "symbol": "AMZN",
    "price": 3300.75,
    "volume": 200,
    "volatility": 0.20,
    "market_sentiment": 0.75
  }
]
EOL

echo "Project initialization complete!"
echo "Run 'docker-compose up' to start all services."