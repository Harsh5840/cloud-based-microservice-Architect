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

interface TradesTableProps {
  trades: Trade[];
}

export function TradesTable({ trades }: TradesTableProps) {
  const formatRiskScore = (score: number) => {
    return (score * 100).toFixed(1) + '%';
  };

  const getRiskBadgeColor = (score: number) => {
    if (score < 0.2) return 'bg-green-100 text-green-800';
    if (score < 0.4) return 'bg-yellow-100 text-yellow-800';
    if (score < 0.6) return 'bg-orange-100 text-orange-800';
    if (score < 0.8) return 'bg-red-100 text-red-800';
    return 'bg-red-200 text-red-900';
  };

  const getRiskLabel = (score: number) => {
    if (score < 0.2) return 'Very Low';
    if (score < 0.4) return 'Low';
    if (score < 0.6) return 'Medium';
    if (score < 0.8) return 'High';
    return 'Very High';
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (trades.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Trades</h3>
        </div>
        <div className="p-6 text-center text-gray-500">
          <div className="text-4xl mb-4">📊</div>
          <p>No trades data available</p>
          <p className="text-sm mt-2">Start the ingestor service to see real-time data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Recent Trades</h3>
        <p className="text-sm text-gray-600">Latest {trades.length} processed trades</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Trade ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Symbol
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Risk Score
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Timestamp
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Source
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {trades.map((trade) => (
              <tr key={trade.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {trade.trade_id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <span className="font-semibold">
                    {trade.financial_data?.symbol || 'N/A'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRiskBadgeColor(trade.risk_score)}`}>
                    {formatRiskScore(trade.risk_score)} ({getRiskLabel(trade.risk_score)})
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {trade.financial_data?.price ? `$${trade.financial_data.price.toFixed(2)}` : 'N/A'}
                  {trade.financial_data?.price_change_percent && (
                    <span className={`ml-2 text-xs ${trade.financial_data.price_change_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ({trade.financial_data.price_change_percent >= 0 ? '+' : ''}{trade.financial_data.price_change_percent.toFixed(2)}%)
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatTimestamp(trade.timestamp)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className="capitalize">{trade.source}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}