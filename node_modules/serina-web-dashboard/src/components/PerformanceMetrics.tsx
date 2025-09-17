import { useSimulation } from '@services/SimulationContext'

export function PerformanceMetrics() {
  const { simulationData } = useSimulation()

  if (!simulationData) {
    return (
      <div className="card">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  const { performance } = simulationData

  const getStatusColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value >= thresholds.good) return 'text-green-600 bg-green-100'
    if (value >= thresholds.warning) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const metrics = [
    {
      label: 'Frame Rate',
      value: performance.frameRate.toFixed(1),
      unit: 'FPS',
      status: getStatusColor(performance.frameRate, { good: 30, warning: 20 })
    },
    {
      label: 'Generations/Sec',
      value: performance.generationsPerSecond.toFixed(1),
      unit: 'gen/s',
      status: getStatusColor(performance.generationsPerSecond, { good: 2, warning: 1 })
    },
    {
      label: 'Memory Usage',
      value: performance.memoryUsage.toFixed(1),
      unit: 'MB',
      status: getStatusColor(100 - performance.memoryUsage, { good: 50, warning: 25 })
    },
    {
      label: 'CPU Usage',
      value: performance.cpuUsage.toFixed(1),
      unit: '%',
      status: getStatusColor(100 - performance.cpuUsage, { good: 50, warning: 20 })
    }
  ]

  return (
    <div className="card">
      <div className="border-b border-gray-200 pb-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Performance Metrics</h3>
        <p className="text-sm text-gray-600">System performance and optimization status</p>
      </div>

      <div className="space-y-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-700">{metric.label}</div>
              <div className="text-xs text-gray-500">Real-time monitoring</div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="text-right">
                <div className="text-lg font-bold text-gray-900">
                  {metric.value}
                </div>
                <div className="text-xs text-gray-500">{metric.unit}</div>
              </div>
              <div className={`w-3 h-3 rounded-full ${metric.status.split(' ')[1]}`}></div>
            </div>
          </div>
        ))}
      </div>

      {/* Performance Charts (Placeholder) */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Performance History</h4>
        <div className="h-24 bg-gray-100 rounded-lg flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="text-sm">📈 Performance Charts</div>
            <div className="text-xs">Real-time graphs coming soon</div>
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-3">System Status</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">SIMD Optimization</span>
            <span className="text-green-600 font-medium">✓ Enabled</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">OpenMP Threading</span>
            <span className="text-green-600 font-medium">✓ Active</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Spatial Hashing</span>
            <span className="text-green-600 font-medium">✓ Optimized</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Memory Pooling</span>
            <span className="text-green-600 font-medium">✓ Active</span>
          </div>
        </div>
      </div>
    </div>
  )
}