-- Initialize Financial Risk Analyzer Database Schema

-- Create risk_scores table
CREATE TABLE IF NOT EXISTS risk_scores (
  id SERIAL PRIMARY KEY,
  trade_id VARCHAR(255) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  source VARCHAR(100) NOT NULL,
  financial_data JSONB NOT NULL,
  risk_score DECIMAL(5,4) NOT NULL,
  processed_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_risk_scores_trade_id ON risk_scores(trade_id);
CREATE INDEX IF NOT EXISTS idx_risk_scores_timestamp ON risk_scores(timestamp);
CREATE INDEX IF NOT EXISTS idx_risk_scores_risk_score ON risk_scores(risk_score);

-- Create view for risk score statistics
CREATE OR REPLACE VIEW risk_score_stats AS
SELECT 
  DATE_TRUNC('day', timestamp) AS day,
  COUNT(*) AS total_trades,
  AVG(risk_score) AS avg_risk_score,
  MIN(risk_score) AS min_risk_score,
  MAX(risk_score) AS max_risk_score,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY risk_score) AS median_risk_score
FROM risk_scores
GROUP BY DATE_TRUNC('day', timestamp);

-- Create function to get risk category
CREATE OR REPLACE FUNCTION get_risk_category(score DECIMAL) 
RETURNS TEXT AS $$
BEGIN
  RETURN CASE
    WHEN score BETWEEN 0 AND 0.2 THEN 'very_low'
    WHEN score BETWEEN 0.2 AND 0.4 THEN 'low'
    WHEN score BETWEEN 0.4 AND 0.6 THEN 'medium'
    WHEN score BETWEEN 0.6 AND 0.8 THEN 'high'
    WHEN score BETWEEN 0.8 AND 1 THEN 'very_high'
    ELSE 'unknown'
  END;
END;
$$ LANGUAGE plpgsql;