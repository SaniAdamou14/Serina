import { useState, useEffect } from 'react'
import { SimulationDashboard } from '@components/SimulationDashboard'
import { SimulationProvider } from '@services/SimulationContext'
import { SelectionProvider } from '@services/SelectionContext'
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
        <SelectionProvider>
          <div className="min-h-screen bg-slate-950">
            <SimulationDashboard />
          </div>
        </SelectionProvider>
      </SimulationProvider>
    </ErrorBoundary>
  )
}

export default App