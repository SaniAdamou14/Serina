import { SimulationDashboard } from '@components/SimulationDashboard'
import { SimulationProvider } from '@services/SimulationContext'
import { SelectionProvider } from '@services/SelectionContext'
import { GameLogProvider } from '@services/GameLogContext'
import { ErrorBoundary } from '@components/ErrorBoundary'

function App() {
  return (
    <ErrorBoundary>
      <SimulationProvider>
        <GameLogProvider>
          <SelectionProvider>
            <SimulationDashboard />
          </SelectionProvider>
        </GameLogProvider>
      </SimulationProvider>
    </ErrorBoundary>
  )
}

export default App
