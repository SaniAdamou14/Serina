import { Pause, Play, Save, SkipForward, Square } from 'lucide-react'
import { useSimulation } from '@services/SimulationContext'
import { SPEED_TIERS } from './gameConstants'

interface TimeControlsProps {
  activeSpeed: number | null
  onSpeed: (ticksPerSecond: number) => void
  onTogglePause: () => void
  onStep: () => void
  onSave: () => void
  busy: boolean
}

/**
 * Temps de la simulation en bas à droite, façon RimWorld. Le temps est affiché en
 * ticks : le moteur ne compte pas encore de vraies générations biologiques.
 */
export function TimeControls({ activeSpeed, onSpeed, onTogglePause, onStep, onSave, busy }: TimeControlsProps) {
  const { simulationData, isConnected, isRunning, currentSimulationId, stopCurrentSimulation } = useSimulation()
  const disabled = !isConnected || !currentSimulationId

  return (
    <div className="game-panel absolute right-2 bottom-11 z-20 w-60 p-1.5 space-y-1.5">
      <div className="flex items-baseline justify-between px-1">
        <span className="text-sm font-semibold">Tick {(simulationData?.status.generation ?? 0).toLocaleString()}</span>
        <span className={`text-xs ${isRunning ? 'text-slate-400' : 'text-primary-300 font-semibold'}`}>{isRunning ? 'En cours' : 'En pause'}</span>
      </div>

      <div className="flex items-center gap-0.5">
        <button className="game-button px-2 py-1" onClick={onTogglePause} disabled={disabled} title={isRunning ? 'Pause (Espace)' : 'Reprendre (Espace)'}>
          {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>
        <button className="game-button px-2 py-1" onClick={onStep} disabled={disabled || busy} title="Avancer d'un tick">
          <SkipForward className="w-3.5 h-3.5" />
        </button>
        {SPEED_TIERS.map((tier, index) => (
          <button
            key={tier}
            className={`game-button flex-1 py-1 text-xs ${activeSpeed === tier ? 'game-button-active' : ''}`}
            onClick={() => onSpeed(tier)}
            disabled={disabled}
            title={`${tier} tick(s) par seconde (${index + 1})`}
          >
            {tier}x
          </button>
        ))}
      </div>

      <div className="flex gap-0.5">
        <button className="game-button flex-1 py-1 text-xs flex items-center justify-center gap-1" onClick={onSave} disabled={disabled || busy} title="Sauvegarder sans arrêter">
          <Save className="w-3.5 h-3.5" /> Sauvegarder
        </button>
        <button
          className="game-button flex-1 py-1 text-xs flex items-center justify-center gap-1 text-red-300"
          onClick={() => stopCurrentSimulation()}
          disabled={disabled}
          title="Arrêter la simulation (sauvegarde automatiquement)"
        >
          <Square className="w-3.5 h-3.5" /> Arrêter
        </button>
      </div>
    </div>
  )
}
