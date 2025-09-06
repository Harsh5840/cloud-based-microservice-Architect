const express = require('express');
const { Pool } = require('pg');
require('dotenv').config();

const router = express.Router();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'financial_risk',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20
};

// Create connection pool
const pool = new Pool(dbConfig);

/**
 * @route GET /api/trades
 * @desc Get all trades with risk scores, with pagination and filtering
 */
router.get('/', async (req, res) => {
  try {
    const { 
      limit = 20, 
      offset = 0, 
      start_date, 
      end_date,
      min_risk,
      max_risk,
      sort_by = 'timestamp',
      sort_order = 'desc'
    } = req.query;
    
    // Build query with filters
    let query = 'SELECT * FROM risk_scores WHERE 1=1';
    const queryParams = [];
    let paramIndex = 1;
    
    // Date range filter
    if (start_date) {
      query += ` AND timestamp >= $${paramIndex++}`;
      queryParams.push(start_date);
    }
    
    if (end_date) {
      query += ` AND timestamp <= $${paramIndex++}`;
      queryParams.push(end_date);
    }
    
    // Risk score range filter
    if (min_risk !== undefined) {
      query += ` AND risk_score >= $${paramIndex++}`;
      queryParams.push(parseFloat(min_risk));
    }
    
    if (max_risk !== undefined) {
      query += ` AND risk_score <= $${paramIndex++}`;
      queryParams.push(parseFloat(max_risk));
    }
    
    // Validate sort parameters
    const validSortColumns = ['timestamp', 'risk_score', 'processed_at', 'trade_id'];
    const validSortOrders = ['asc', 'desc'];
    
    const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'timestamp';
    const sortDir = validSortOrders.includes(sort_order.toLowerCase()) ? sort_order.toLowerCase() : 'desc';
    
    // Add sorting
    query += ` ORDER BY ${sortColumn} ${sortDir}`;
    
    // Add pagination
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    queryParams.push(parseInt(limit), parseInt(offset));
    
    // Execute query
    const result = await pool.query(query, queryParams);
    
    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM risk_scores WHERE 1=1';
    let countParams = [];
    paramIndex = 1;
    
    if (start_date) {
      countQuery += ` AND timestamp >= $${paramIndex++}`;
      countParams.push(start_date);
    }
    
    if (end_date) {
      countQuery += ` AND timestamp <= $${paramIndex++}`;
      countParams.push(end_date);
    }
    
    if (min_risk !== undefined) {
      countQuery += ` AND risk_score >= $${paramIndex++}`;
      countParams.push(parseFloat(min_risk));
    }
    
    if (max_risk !== undefined) {
      countQuery += ` AND risk_score <= $${paramIndex++}`;
      countParams.push(parseFloat(max_risk));
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);
    
    res.json({
      trades: result.rows,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching trades:', error);
    res.status(500).json({ error: 'Failed to fetch trades' });
  }
});

/**
 * @route GET /api/trades/:tradeId
 * @desc Get a specific trade by ID
 */
router.get('/:tradeId', async (req, res) => {
  try {
    const { tradeId } = req.params;
    
    const query = 'SELECT * FROM risk_scores WHERE trade_id = $1';
    const result = await pool.query(query, [tradeId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Trade not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error(`Error fetching trade ${req.params.tradeId}:`, error);
    res.status(500).json({ error: 'Failed to fetch trade' });
  }
});

/**
 * @route GET /api/trades/stats/summary
 * @desc Get summary statistics of risk scores
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let query = `
      SELECT 
        COUNT(*) as total_trades,
        AVG(risk_score) as avg_risk_score,
        MIN(risk_score) as min_risk_score,
        MAX(risk_score) as max_risk_score,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY risk_score) as median_risk_score
      FROM risk_scores
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramIndex = 1;
    
    if (start_date) {
      query += ` AND timestamp >= $${paramIndex++}`;
      queryParams.push(start_date);
    }
    
    if (end_date) {
      query += ` AND timestamp <= $${paramIndex++}`;
      queryParams.push(end_date);
    }
    
    const result = await pool.query(query, queryParams);
    
    // Get risk distribution
    let distributionQuery = `
      SELECT 
        CASE 
          WHEN risk_score BETWEEN 0 AND 0.2 THEN 'very_low'
          WHEN risk_score BETWEEN 0.2 AND 0.4 THEN 'low'
          WHEN risk_score BETWEEN 0.4 AND 0.6 THEN 'medium'
          WHEN risk_score BETWEEN 0.6 AND 0.8 THEN 'high'
          WHEN risk_score BETWEEN 0.8 AND 1 THEN 'very_high'
        END as risk_category,
        COUNT(*) as count
      FROM risk_scores
      WHERE 1=1
    `;
    
    let distParams = [];
    paramIndex = 1;
    
    if (start_date) {
      distributionQuery += ` AND timestamp >= $${paramIndex++}`;
      distParams.push(start_date);
    }
    
    if (end_date) {
      distributionQuery += ` AND timestamp <= $${paramIndex++}`;
      distParams.push(end_date);
    }
    
    distributionQuery += ' GROUP BY risk_category';
    
    const distributionResult = await pool.query(distributionQuery, distParams);
    
    res.json({
      summary: result.rows[0],
      distribution: distributionResult.rows
    });
  } catch (error) {
    console.error('Error fetching risk statistics:', error);
    res.status(500).json({ error: 'Failed to fetch risk statistics' });
  }
});

module.exports = router;