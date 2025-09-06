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
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const minRisk = searchParams.get('min_risk');
    const maxRisk = searchParams.get('max_risk');
    const sortBy = searchParams.get('sort_by') || 'timestamp';
    const sortOrder = searchParams.get('sort_order') || 'desc';
    
    // Build query with filters
    let query = 'SELECT * FROM risk_scores WHERE 1=1';
    const queryParams: any[] = [];
    let paramIndex = 1;
    
    // Date range filter
    if (startDate) {
      query += ` AND timestamp >= $${paramIndex++}`;
      queryParams.push(startDate);
    }
    
    if (endDate) {
      query += ` AND timestamp <= $${paramIndex++}`;
      queryParams.push(endDate);
    }
    
    // Risk score range filter
    if (minRisk !== null) {
      query += ` AND risk_score >= $${paramIndex++}`;
      queryParams.push(parseFloat(minRisk));
    }
    
    if (maxRisk !== null) {
      query += ` AND risk_score <= $${paramIndex++}`;
      queryParams.push(parseFloat(maxRisk));
    }
    
    // Validate sort parameters
    const validSortColumns = ['timestamp', 'risk_score', 'processed_at', 'trade_id'];
    const validSortOrders = ['asc', 'desc'];
    
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'timestamp';
    const sortDir = validSortOrders.includes(sortOrder.toLowerCase()) ? sortOrder.toLowerCase() : 'desc';
    
    // Add sorting
    query += ` ORDER BY ${sortColumn} ${sortDir}`;
    
    // Add pagination
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    queryParams.push(limit, offset);
    
    // Execute query
    const result = await pool.query(query, queryParams);
    
    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM risk_scores WHERE 1=1';
    let countParams: any[] = [];
    paramIndex = 1;
    
    if (startDate) {
      countQuery += ` AND timestamp >= $${paramIndex++}`;
      countParams.push(startDate);
    }
    
    if (endDate) {
      countQuery += ` AND timestamp <= $${paramIndex++}`;
      countParams.push(endDate);
    }
    
    if (minRisk !== null) {
      countQuery += ` AND risk_score >= $${paramIndex++}`;
      countParams.push(parseFloat(minRisk));
    }
    
    if (maxRisk !== null) {
      countQuery += ` AND risk_score <= $${paramIndex++}`;
      countParams.push(parseFloat(maxRisk));
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);
    
    return NextResponse.json({
      trades: result.rows,
      pagination: {
        total: totalCount,
        limit: limit,
        offset: offset,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching trades:', error);
    return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 500 });
  }
}