import { SimulationDashboard } from '@components/SimulationDashboard'
import { SimulationProvider } from '@services/SimulationContext'
import { SelectionProvider } from '@services/SelectionContext'
import { ErrorBoundary } from '@components/ErrorBoundary'

function App() {
  return (
    <ErrorBoundary>
      <SimulationProvider>
        <SelectionProvider>
          <SimulationDashboard />
        </SelectionProvider>
      </SimulationProvider>
    </ErrorBoundary>
  )
}

export default App
