const { saveRiskScore } = require('./db');

/**
 * Process financial data and compute risk score
 * @param {Object} data - Financial data from Kafka
 * @returns {Object} - Processing result with risk score
 */
async function processTask(data) {
  try {
    console.log('Processing financial data task');
    
    // Extract the financial data
    const financialData = data.data;
    if (!financialData) {
      throw new Error('Invalid financial data format');
    }
    
    // Calculate risk score based on financial data
    const riskScore = calculateRiskScore(financialData);
    
    // Prepare record for database
    const record = {
      timestamp: data.timestamp || new Date().toISOString(),
      source: data.source || 'unknown',
      trade_id: financialData.id || financialData.trade_id || `trade-${Date.now()}`,
      financial_data: financialData,
      risk_score: riskScore,
      processed_at: new Date().toISOString()
    };
    
    // Save to database
    await saveRiskScore(record);
    
    return {
      success: true,
      riskScore,
      tradeId: record.trade_id
    };
  } catch (error) {
    console.error('Error processing task:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Calculate risk score based on financial data
 * @param {Object} data - Financial data
 * @returns {number} - Risk score between 0 and 1
 */
function calculateRiskScore(data) {
  // Enhanced risk calculation algorithm for real financial data
  
  let score = 0.3; // Start with lower baseline risk
  
  // Factor 1: Volatility (20% weight)
  if (data.volatility !== undefined) {
    // Higher volatility = higher risk
    const volatilityRisk = normalizeValue(data.volatility, 5, 80) * 0.2;
    score += volatilityRisk;
  }
  
  // Factor 2: Volume Analysis (15% weight)
  if (data.volume !== undefined) {
    // Very high or very low volumes can indicate risk
    const normalizedVolume = normalizeValue(data.volume, 100000, 50000000);
    
    // Risk is higher at extremes (very low or very high volume)
    let volumeRisk;
    if (normalizedVolume < 0.2 || normalizedVolume > 0.8) {
      volumeRisk = 0.15; // High risk for extreme volumes
    } else {
      volumeRisk = Math.abs(normalizedVolume - 0.5) * 0.3; // Moderate risk for normal volumes
    }
    score += volumeRisk;
  }
  
  // Factor 3: Price Change Percentage (25% weight)
  if (data.price_change_percent !== undefined) {
    // Larger absolute price changes = higher risk
    const priceChangeRisk = Math.min(Math.abs(data.price_change_percent) / 8, 1) * 0.25;
    score += priceChangeRisk;
  }
  
  // Factor 4: Market Sentiment (20% weight)
  if (data.market_sentiment !== undefined) {
    const sentimentRiskMap = {
      'very_bearish': 0.18,  // High risk
      'bearish': 0.12,       // Medium-high risk
      'neutral': 0.08,       // Medium risk
      'bullish': 0.05,       // Low-medium risk
      'very_bullish': 0.03   // Low risk (but still some risk due to potential bubble)
    };
    
    score += sentimentRiskMap[data.market_sentiment] || 0.1;
  }
  
  // Factor 5: Price Range Analysis (10% weight)
  if (data.high !== undefined && data.low !== undefined && data.close !== undefined) {
    // Higher intraday range indicates more volatility/risk
    const priceRange = (data.high - data.low) / data.close;
    const rangeRisk = Math.min(priceRange * 2, 1) * 0.1;
    score += rangeRisk;
  }
  
  // Factor 6: Gap Analysis (10% weight)
  if (data.open !== undefined && data.previous_close !== undefined) {
    // Large gaps between previous close and current open indicate risk
    const gapPercent = Math.abs((data.open - data.previous_close) / data.previous_close) * 100;
    const gapRisk = Math.min(gapPercent / 5, 1) * 0.1;
    score += gapRisk;
  }
  
  // Ensure score is between 0 and 1
  const finalScore = Math.max(0, Math.min(1, score));
  
  // Add some logging for debugging
  console.log(`Risk calculation for ${data.symbol || 'unknown'}: ${finalScore.toFixed(4)} (volatility: ${data.volatility}, change: ${data.price_change_percent}%, sentiment: ${data.market_sentiment})`);
  
  return finalScore;
}

/**
 * Normalize a value to a 0-1 range
 * @param {number} value - Value to normalize
 * @param {number} min - Minimum expected value
 * @param {number} max - Maximum expected value
 * @returns {number} - Normalized value between 0 and 1
 */
function normalizeValue(value, min, max) {
  if (value <= min) return 0;
  if (value >= max) return 1;
  return (value - min) / (max - min);
}

module.exports = {
  processTask
};