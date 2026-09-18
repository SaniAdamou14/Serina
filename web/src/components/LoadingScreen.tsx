interface LoadingScreenProps {
  message?: string
}

export function LoadingScreen({ message = "Initializing Serina Ecosystem..." }: LoadingScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-genetic-50 flex items-center justify-center">
      <div className="text-center space-y-8">
        {/* Animated DNA Helix */}
        <div className="relative w-24 h-24 mx-auto">
          <div className="absolute inset-0 animate-spin">
            <div className="w-full h-full border-4 border-primary-200 border-t-primary-600 rounded-full"></div>
          </div>
          <div className="absolute inset-2 animate-pulse">
            <div className="w-full h-full border-2 border-genetic-300 border-b-genetic-600 rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
          </div>
        </div>

        {/* Serina Logo */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-gradient">
            🧬 Serina
          </h1>
          <p className="text-lg text-gray-600 font-medium">
            Evolutionary Ecosystem Simulator
          </p>
        </div>

        {/* Loading Message */}
        <div className="space-y-3">
          <p className="text-gray-700">
            {message}
          </p>
          
          {/* Progress Dots */}
          <div className="flex justify-center space-x-2">
            <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
            <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
            <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20 max-w-md">
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-center justify-between">
              <span>Genetic Engine</span>
              <span className="text-green-600 font-medium">✓ Ready</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Physics Simulation</span>
              <span className="text-green-600 font-medium">✓ Ready</span>
            </div>
            <div className="flex items-center justify-between">
              <span>WebSocket Connection</span>
              <span className="text-yellow-600 font-medium">⟳ Connecting</span>
            </div>
          </div>
        </div>

        {/* Version Info */}
        <p className="text-xs text-gray-500">
          Version 1.0.0 • Built with C++20 & React
        </p>
      </div>
    </div>
  )
}