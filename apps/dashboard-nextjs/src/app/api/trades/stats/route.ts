import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'financial_risk',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20
};

// Create connection pool
const pool = new Pool(dbConfig);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    
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
    
    const queryParams: any[] = [];
    let paramIndex = 1;
    
    if (startDate) {
      query += ` AND timestamp >= $${paramIndex++}`;
      queryParams.push(startDate);
    }
    
    if (endDate) {
      query += ` AND timestamp <= $${paramIndex++}`;
      queryParams.push(endDate);
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
    
    let distParams: any[] = [];
    paramIndex = 1;
    
    if (startDate) {
      distributionQuery += ` AND timestamp >= $${paramIndex++}`;
      distParams.push(startDate);
    }
    
    if (endDate) {
      distributionQuery += ` AND timestamp <= $${paramIndex++}`;
      distParams.push(endDate);
    }
    
    distributionQuery += ' GROUP BY risk_category';
    
    const distributionResult = await pool.query(distributionQuery, distParams);
    
    return NextResponse.json({
      summary: result.rows[0],
      distribution: distributionResult.rows
    });
  } catch (error) {
    console.error('Error fetching risk statistics:', error);
    return NextResponse.json({ error: 'Failed to fetch risk statistics' }, { status: 500 });
  }
}