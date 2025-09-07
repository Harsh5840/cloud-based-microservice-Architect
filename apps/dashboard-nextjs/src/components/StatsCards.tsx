interface StatsCardsProps {
  stats: {
    summary: {
      total_trades: number;
      avg_risk_score: number;
      min_risk_score: number;
      max_risk_score: number;
      median_risk_score: number;
    };
  };
}

export function StatsCards({ stats }: StatsCardsProps) {
  const { summary } = stats;

  const formatRiskScore = (score: number) => {
    return (score * 100).toFixed(1) + '%';
  };

  const getRiskColor = (score: number) => {
    if (score < 0.2) return 'text-green-600 bg-green-100';
    if (score < 0.4) return 'text-yellow-600 bg-yellow-100';
    if (score < 0.6) return 'text-orange-600 bg-orange-100';
    if (score < 0.8) return 'text-red-600 bg-red-100';
    return 'text-red-800 bg-red-200';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      {/* Total Trades */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
              <span className="text-blue-600 font-semibold text-sm">📊</span>
            </div>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Total Trades</p>
            <p className="text-2xl font-semibold text-gray-900">
              {summary.total_trades.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Average Risk */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={`w-8 h-8 rounded-md flex items-center justify-center ${getRiskColor(summary.avg_risk_score)}`}>
              <span className="font-semibold text-sm">📈</span>
            </div>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Avg Risk</p>
            <p className="text-2xl font-semibold text-gray-900">
              {formatRiskScore(summary.avg_risk_score)}
            </p>
          </div>
        </div>
      </div>

      {/* Min Risk */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
              <span className="text-green-600 font-semibold text-sm">📉</span>
            </div>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Min Risk</p>
            <p className="text-2xl font-semibold text-gray-900">
              {formatRiskScore(summary.min_risk_score)}
            </p>
          </div>
        </div>
      </div>

      {/* Max Risk */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-red-100 rounded-md flex items-center justify-center">
              <span className="text-red-600 font-semibold text-sm">⚠️</span>
            </div>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Max Risk</p>
            <p className="text-2xl font-semibold text-gray-900">
              {formatRiskScore(summary.max_risk_score)}
            </p>
          </div>
        </div>
      </div>

      {/* Median Risk */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={`w-8 h-8 rounded-md flex items-center justify-center ${getRiskColor(summary.median_risk_score)}`}>
              <span className="font-semibold text-sm">📊</span>
            </div>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Median Risk</p>
            <p className="text-2xl font-semibold text-gray-900">
              {formatRiskScore(summary.median_risk_score)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}