const { Pool } = require('pg');
require('dotenv').config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'financial_risk',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000
};

// Create connection pool
const pool = new Pool(dbConfig);

// Test database connection
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

/**
 * Initialize database connection
 */
async function initializeDb() {
  try {
    const client = await pool.connect();
    console.log('Successfully connected to database');
    client.release();
    return true;
  } catch (error) {
    console.error('Error connecting to database:', error);
    throw error;
  }
}

/**
 * Save risk score and financial data to database
 * @param {Object} record - Record to save
 */
async function saveRiskScore(record) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const query = `
      INSERT INTO risk_scores (
        trade_id, 
        timestamp, 
        source, 
        financial_data, 
        risk_score, 
        processed_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;
    
    const values = [
      record.trade_id,
      record.timestamp,
      record.source,
      JSON.stringify(record.financial_data),
      record.risk_score,
      record.processed_at
    ];
    
    const result = await client.query(query, values);
    await client.query('COMMIT');
    
    console.log(`Saved risk score record with ID: ${result.rows[0].id}`);
    return result.rows[0].id;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error saving risk score to database:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get risk scores by time range
 * @param {string} startTime - ISO timestamp for range start
 * @param {string} endTime - ISO timestamp for range end
 * @param {number} limit - Maximum number of records to return
 */
async function getRiskScores(startTime, endTime, limit = 100) {
  const query = `
    SELECT * FROM risk_scores 
    WHERE timestamp BETWEEN $1 AND $2 
    ORDER BY timestamp DESC 
    LIMIT $3
  `;
  
  try {
    const result = await pool.query(query, [startTime, endTime, limit]);
    return result.rows;
  } catch (error) {
    console.error('Error fetching risk scores:', error);
    throw error;
  }
}

/**
 * Get risk score by trade ID
 * @param {string} tradeId - Trade ID
 */
async function getRiskScoreByTradeId(tradeId) {
  const query = 'SELECT * FROM risk_scores WHERE trade_id = $1';
  
  try {
    const result = await pool.query(query, [tradeId]);
    return result.rows[0] || null;
  } catch (error) {
    console.error(`Error fetching risk score for trade ${tradeId}:`, error);
    throw error;
  }
}

/**
 * Close database connection pool
 */
async function closeDb() {
  try {
    await pool.end();
    console.log('Database connection pool closed');
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
}

module.exports = {
  initializeDb,
  saveRiskScore,
  getRiskScores,
  getRiskScoreByTradeId,
  closeDb
};