interface RiskDistribution {
  risk_category: string;
  count: number;
}

interface RiskChartProps {
  distribution: RiskDistribution[];
}

export function RiskChart({ distribution }: RiskChartProps) {
  const total = distribution.reduce((sum, item) => sum + parseInt(item.count.toString()), 0);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'very_low': return 'bg-green-500';
      case 'low': return 'bg-yellow-500';
      case 'medium': return 'bg-orange-500';
      case 'high': return 'bg-red-500';
      case 'very_high': return 'bg-red-700';
      default: return 'bg-gray-500';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'very_low': return 'Very Low';
      case 'low': return 'Low';
      case 'medium': return 'Medium';
      case 'high': return 'High';
      case 'very_high': return 'Very High';
      default: return category;
    }
  };

  if (distribution.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Risk Distribution</h3>
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-4">📊</div>
          <p>No risk data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Risk Distribution</h3>
      
      {/* Simple Bar Chart */}
      <div className="space-y-4">
        {distribution.map((item) => {
          const percentage = total > 0 ? (parseInt(item.count.toString()) / total) * 100 : 0;
          
          return (
            <div key={item.risk_category} className="flex items-center">
              <div className="w-20 text-sm text-gray-600 text-right mr-3">
                {getCategoryLabel(item.risk_category)}
              </div>
              <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                <div
                  className={`h-4 rounded-full ${getCategoryColor(item.risk_category)}`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
              <div className="w-16 text-sm text-gray-600 text-left ml-3">
                {item.count} ({percentage.toFixed(1)}%)
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Total Trades:</span>
          <span className="font-semibold">{total.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}