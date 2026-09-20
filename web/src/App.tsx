import { useState, useEffect } from 'react'
import { SimulationDashboard } from '@components/SimulationDashboard'
import { SimulationProvider } from '@services/SimulationContext'
import { LoadingScreen } from '@components/LoadingScreen'
import { ErrorBoundary } from '@components/ErrorBoundary'

function App() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate initialization delay
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return <LoadingScreen />
  }

  return (
    <ErrorBoundary>
      <SimulationProvider>
        <div className="min-h-screen bg-slate-950">
          <SimulationDashboard />
        </div>
      </SimulationProvider>
    </ErrorBoundary>
  )
}

export default App