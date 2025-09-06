const axios = require('axios');

class AlphaVantageClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://www.alphavantage.co/query';
    this.rateLimitDelay = 12000; // 12 seconds between calls (free tier: 5 calls per minute)
    this.lastCallTime = 0;
  }

  /**
   * Rate limiting to respect Alpha Vantage API limits
   */
  async waitForRateLimit() {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCallTime;
    
    if (timeSinceLastCall < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastCall;
      console.log(`Rate limiting: waiting ${waitTime}ms before next API call`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastCallTime = Date.now();
  }

  /**
   * Get real-time quote for a symbol
   */
  async getQuote(symbol) {
    await this.waitForRateLimit();
    
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          function: 'GLOBAL_QUOTE',
          symbol: symbol,
          apikey: this.apiKey
        },
        timeout: 10000
      });

      const quote = response.data['Global Quote'];
      if (!quote || Object.keys(quote).length === 0) {
        throw new Error(`No data returned for symbol ${symbol}`);
      }

      return this.transformQuoteData(symbol, quote);
    } catch (error) {
      console.error(`Error fetching quote for ${symbol}:`, error.message);
      throw error;
    }
  }

  /**
   * Get intraday data for a symbol
   */
  async getIntradayData(symbol, interval = '5min') {
    await this.waitForRateLimit();
    
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          function: 'TIME_SERIES_INTRADAY',
          symbol: symbol,
          interval: interval,
          apikey: this.apiKey,
          outputsize: 'compact'
        },
        timeout: 15000
      });

      const timeSeries = response.data[`Time Series (${interval})`];
      if (!timeSeries) {
        throw new Error(`No intraday data returned for symbol ${symbol}`);
      }

      return this.transformIntradayData(symbol, timeSeries);
    } catch (error) {
      console.error(`Error fetching intraday data for ${symbol}:`, error.message);
      throw error;
    }
  }

  /**
   * Transform Alpha Vantage quote data to our format
   */
  transformQuoteData(symbol, quote) {
    const price = parseFloat(quote['05. price']);
    const previousClose = parseFloat(quote['08. previous close']);
    const changePercent = parseFloat(quote['10. change percent'].replace('%', ''));
    
    return {
      id: `${symbol}_${Date.now()}`,
      symbol: symbol,
      timestamp: new Date().toISOString(),
      price: price,
      open: parseFloat(quote['02. open']),
      high: parseFloat(quote['03. high']),
      low: parseFloat(quote['04. low']),
      close: price,
      volume: parseInt(quote['06. volume']),
      price_change_percent: changePercent,
      volatility: this.calculateVolatility(price, previousClose, changePercent),
      market_sentiment: this.determineSentiment(changePercent),
      previous_close: previousClose,
      change: parseFloat(quote['09. change'])
    };
  }

  /**
   * Transform Alpha Vantage intraday data to our format
   */
  transformIntradayData(symbol, timeSeries) {
    const entries = Object.entries(timeSeries).slice(0, 5); // Get latest 5 data points
    
    return entries.map(([timestamp, data]) => {
      const open = parseFloat(data['1. open']);
      const close = parseFloat(data['4. close']);
      const changePercent = ((close - open) / open) * 100;
      
      return {
        id: `${symbol}_${timestamp.replace(/[:\s-]/g, '_')}`,
        symbol: symbol,
        timestamp: new Date(timestamp).toISOString(),
        price: close,
        open: open,
        high: parseFloat(data['2. high']),
        low: parseFloat(data['3. low']),
        close: close,
        volume: parseInt(data['5. volume']),
        price_change_percent: changePercent,
        volatility: this.calculateVolatility(close, open, changePercent),
        market_sentiment: this.determineSentiment(changePercent)
      };
    });
  }

  /**
   * Calculate volatility based on price movement
   */
  calculateVolatility(currentPrice, previousPrice, changePercent) {
    // Simple volatility calculation based on price change percentage
    const baseVolatility = Math.abs(changePercent) * 2;
    
    // Add some randomness to simulate real market volatility
    const volatilityNoise = (Math.random() - 0.5) * 10;
    
    return Math.max(5, Math.min(100, baseVolatility + volatilityNoise));
  }

  /**
   * Determine market sentiment based on price change
   */
  determineSentiment(changePercent) {
    if (changePercent > 3) return 'very_bullish';
    if (changePercent > 1) return 'bullish';
    if (changePercent > -1) return 'neutral';
    if (changePercent > -3) return 'bearish';
    return 'very_bearish';
  }

  /**
   * Get multiple symbols data
   */
  async getMultipleQuotes(symbols) {
    const results = [];
    
    for (const symbol of symbols) {
      try {
        const quote = await this.getQuote(symbol);
        results.push(quote);
        console.log(`✓ Fetched data for ${symbol}`);
      } catch (error) {
        console.error(`✗ Failed to fetch data for ${symbol}:`, error.message);
      }
    }
    
    return results;
  }
}

module.exports = AlphaVantageClient;