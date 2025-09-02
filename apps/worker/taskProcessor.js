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
  // This is a simplified risk calculation algorithm
  // In a real-world scenario, this would be much more sophisticated
  
  let score = 0.5; // Default medium risk
  
  // Factor 1: Volatility (if available)
  if (data.volatility !== undefined) {
    // Higher volatility = higher risk
    score += normalizeValue(data.volatility, 0, 100) * 0.2;
  }
  
  // Factor 2: Volume (if available)
  if (data.volume !== undefined) {
    // Extremely high or low volumes might indicate risk
    const normalizedVolume = normalizeValue(data.volume, 0, 1000000);
    const volumeRisk = Math.abs(normalizedVolume - 0.5) * 2; // Convert to 0-1 range centered at 0.5
    score += volumeRisk * 0.15;
  }
  
  // Factor 3: Price change (if available)
  if (data.price_change_percent !== undefined) {
    // Larger price changes = higher risk
    const priceChangeRisk = Math.abs(data.price_change_percent) / 10; // Normalize to 0-1 range
    score += Math.min(priceChangeRisk, 1) * 0.25;
  }
  
  // Factor 4: Market conditions (if available)
  if (data.market_sentiment !== undefined) {
    // Convert sentiment string to risk factor
    const sentimentMap = {
      'very_bearish': 0.9,
      'bearish': 0.7,
      'neutral': 0.5,
      'bullish': 0.3,
      'very_bullish': 0.1
    };
    
    if (sentimentMap[data.market_sentiment]) {
      score += sentimentMap[data.market_sentiment] * 0.2;
    }
  }
  
  // Ensure score is between 0 and 1
  return Math.max(0, Math.min(1, score));
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