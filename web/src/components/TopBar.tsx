import { useEffect, useState } from 'react'
import { Globe2, Clock, Users, PawPrint, Timer, Zap, WifiOff, RefreshCw } from 'lucide-react'
import { useSimulation } from '@services/SimulationContext'

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

/**
 * Barre du haut fixe, toujours visible quel que soit l'onglet actif (façon
 * RimWorld) -- uniquement des chiffres réels : rien ici n'est calculé côté
 * moteur pour "faire joli", tout vient de simulationData ou d'un agrégat
 * honnête calculé côté client (énergie totale = somme réelle de
 * individuals[].energy, pas une invention -- voir le plan Chantier E).
 */
export function TopBar() {
  const { simulationData, isConnected, currentSimulationId, availableSimulations, connect } = useSimulation()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const status = simulationData?.status
  const individuals = simulationData?.individuals.individuals
  const totalEnergy = individuals ? individuals.reduce((sum, i) => sum + i.energy, 0) : 0

  const currentSummary = availableSimulations.find((s) => String(s.id) === String(currentSimulationId))
  const elapsedMs = currentSummary ? now - new Date(currentSummary.startTime).getTime() : null

  return (
    <header className="bg-slate-900 border-b border-slate-700 shrink-0">
      <div className="px-3 sm:px-4 h-11 flex items-center justify-between gap-4 text-sm">
        <div className="flex items-center gap-2 shrink-0">
          <Globe2 className="w-5 h-5 text-primary-400" />
          <h1 className="font-bold text-gradient hidden sm:block whitespace-nowrap">Serina</h1>
        </div>

        {status && (
          <div className="flex items-center gap-4 text-slate-300 overflow-x-auto">
            <span className="flex items-center gap-1.5 whitespace-nowrap"><Clock className="w-4 h-4 text-slate-500" /> Génération {status.generation}</span>
            <span className="flex items-center gap-1.5 whitespace-nowrap"><Users className="w-4 h-4 text-slate-500" /> {status.population.toLocaleString()}</span>
            <span className="flex items-center gap-1.5 whitespace-nowrap"><PawPrint className="w-4 h-4 text-slate-500" /> {status.speciesCount} espèces</span>
            <span className="flex items-center gap-1.5 whitespace-nowrap"><Zap className="w-4 h-4 text-slate-500" /> {totalEnergy.toFixed(0)} énergie totale</span>
            {elapsedMs !== null && (
              <span className="flex items-center gap-1.5 whitespace-nowrap"><Timer className="w-4 h-4 text-slate-500" /> {formatElapsed(elapsedMs)}</span>
            )}
          </div>
        )}

        <div className="shrink-0">
          {isConnected ? (
            <div className="status-indicator status-running">
              <div className="w-2 h-2 rounded-full mr-1.5 bg-emerald-500" />
              <span className="hidden lg:inline">Connecté</span>
            </div>
          ) : (
            <button onClick={connect} className="status-indicator status-stopped flex items-center gap-1.5">
              <WifiOff className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Déconnecté</span>
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
