# Alpha Vantage Setup Guide

## Getting Your Free API Key

1. **Visit Alpha Vantage**: Go to https://www.alphavantage.co/support/#api-key
2. **Sign Up**: Create a free account (no credit card required)
3. **Get API Key**: You'll receive your API key immediately after signup
4. **Free Tier Limits**: 
   - 5 API calls per minute
   - 500 API calls per day

## Configuration

1. **Copy the example environment file**:
   ```bash
   cp apps/ingestor/.env.example apps/ingestor/.env
   ```

2. **Add your API key** to `apps/ingestor/.env`:
   ```env
   ALPHA_VANTAGE_API_KEY=YOUR_ACTUAL_API_KEY_HERE
   USE_DEMO_MODE=false
   ```

3. **Customize symbols** (optional):
   ```env
   SYMBOLS=AAPL,MSFT,GOOGL,AMZN,TSLA,NVDA,META,NFLX
   ```

## Testing the Integration

### Demo Mode (No API Key Required)
```bash
# Set USE_DEMO_MODE=true in .env file
cd apps/ingestor
npm install
npm start
```

### Real Data Mode (API Key Required)
```bash
# Set USE_DEMO_MODE=false and add your API key
cd apps/ingestor
npm install
npm start
```

## Expected Data Format

The system now processes real financial data in this format:

```json
{
  "id": "AAPL_1642204800001",
  "symbol": "AAPL",
  "timestamp": "2024-01-15T14:30:00.000Z",
  "price": 185.59,
  "open": 185.92,
  "high": 186.40,
  "low": 185.19,
  "close": 185.59,
  "volume": 46249900,
  "price_change_percent": -0.18,
  "volatility": 24.5,
  "market_sentiment": "neutral",
  "previous_close": 186.01,
  "change": -0.33
}
```

## Rate Limiting

The integration automatically handles Alpha Vantage's rate limits:
- **Free Tier**: 5 calls per minute, 500 per day
- **Automatic Delays**: 12-second delays between API calls
- **Fallback**: Switches to demo mode if API limits are exceeded

## Market Hours Optimization

The system includes smart scheduling:
- **Regular Polling**: Every 5 minutes (configurable)
- **Market Hours**: Additional data collection during NYSE hours (9:30 AM - 4:00 PM EST, Mon-Fri)
- **Weekend Mode**: Reduced polling when markets are closed

## Troubleshooting

### Common Issues:

1. **"No data returned"**: 
   - Check if your API key is valid
   - Verify the symbol exists (use major stocks like AAPL, MSFT)
   - Check if you've exceeded daily limits

2. **Rate limit errors**:
   - The system automatically handles this
   - Consider increasing `POLLING_INTERVAL` for fewer calls

3. **Network timeouts**:
   - System automatically falls back to demo mode
   - Check your internet connection

### Monitoring:

Watch the logs for these indicators:
- `✓ Fetched data for AAPL` - Success
- `✗ Failed to fetch data` - API issues
- `🔧 Running in DEMO MODE` - Using synthetic data
- `📈 Running with REAL Alpha Vantage data` - Using real data

## Next Steps

Once configured, your Financial Risk Analyzer will:
1. **Fetch real stock data** from Alpha Vantage
2. **Calculate risk scores** using enhanced algorithms
3. **Store results** in PostgreSQL
4. **Display analytics** in the dashboard

The risk calculation now considers:
- Market volatility
- Trading volume patterns
- Price change percentages
- Market sentiment
- Intraday price ranges
- Gap analysis between trading sessions