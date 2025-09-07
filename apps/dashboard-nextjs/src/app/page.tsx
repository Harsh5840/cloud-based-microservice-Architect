'use client';

import { useState, useEffect } from 'react';
import { TradesTable } from '@/components/TradesTable';
import { StatsCards } from '@/components/StatsCards';
import { RiskChart } from '@/components/RiskChart';

interface Trade {
  id: number;
  trade_id: string;
  timestamp: string;
  source: string;
  financial_data: any;
  risk_score: number;
  processed_at: string;
  created_at: string;
}

interface Stats {
  summary: {
    total_trades: number;
    avg_risk_score: number;
    min_risk_score: number;
    max_risk_score: number;
    median_risk_score: number;
  };
  distribution: Array<{
    risk_category: string;
    count: number;
  }>;
}

export default function Dashboard() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    // Refresh data every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch trades and stats in parallel
      const [tradesResponse, statsResponse] = await Promise.all([
        fetch('/api/trades?limit=50'),
        fetch('/api/trades/stats')
      ]);

      if (!tradesResponse.ok || !statsResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const tradesData = await tradesResponse.json();
      const statsData = await statsResponse.json();

      setTrades(tradesData.trades || []);
      setStats(statsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !trades.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading financial data...</p>
        </div>
      </div>
    );
  }

  if (error && !trades.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️ Error</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={fetchData}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Financial Risk Analyzer
              </h1>
              <p className="text-gray-600">
                Real-time risk assessment dashboard
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600">Live Data</span>
              </div>
              <button 
                onClick={fetchData}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        {stats && <StatsCards stats={stats} />}

        {/* Charts and Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          {/* Risk Distribution Chart */}
          <div className="lg:col-span-1">
            {stats && <RiskChart distribution={stats.distribution} />}
          </div>

          {/* Recent Trades Table */}
          <div className="lg:col-span-2">
            <TradesTable trades={trades} />
          </div>
        </div>
      </main>
    </div>
  );
}