import { useState } from 'react'
import { Play, Pause, SkipForward, Square, Save } from 'lucide-react'
import { useSimulation } from '@services/SimulationContext'
import { SimulationCommand } from '../types'

const SPEED_TIERS = [1, 2, 5, 10, 20]
const DEFAULT_TIER = 4

/**
 * Barre du bas fixe façon RimWorld : paliers de vitesse discrets (réels,
 * reliés à setSpeed -> daemon `play(ticksPerSecond)`), play/pause, avance
 * pas-à-pas (relié à `step`), point de sauvegarde manuel (checkpoint sans
 * arrêter -- l'arrêt sauvegarde de toute façon automatiquement, voir
 * Chantier H), et arrêt de la simulation en cours.
 */
export function BottomBar() {
  const { isConnected, isRunning, currentSimulationId, sendCommand, setSpeed, stepSimulation, saveSnapshot, stopCurrentSimulation } = useSimulation()
  const [activeTier, setActiveTier] = useState(DEFAULT_TIER)
  const [isStepping, setIsStepping] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const disabled = !isConnected || !currentSimulationId

  const handleTier = (tier: number) => {
    setActiveTier(tier)
    setSpeed(tier)
  }

  const handleStep = async () => {
    setIsStepping(true)
    try {
      await stepSimulation(1)
    } finally {
      setIsStepping(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await saveSnapshot()
    } catch {
      // connectionError est déjà mis à jour par saveSnapshot() ; rien de
      // plus à faire ici que d'éviter une exception non gérée.
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <footer className="bg-slate-900 border-t border-slate-700 shrink-0 px-3 sm:px-4 h-12 flex items-center justify-center gap-2">
      <button
        onClick={() => sendCommand(isRunning ? SimulationCommand.PAUSE : SimulationCommand.RESUME)}
        disabled={disabled}
        title={isRunning ? 'Pause' : 'Reprendre'}
        className="button-secondary px-3 py-1.5 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </button>

      <button
        onClick={handleStep}
        disabled={disabled || isStepping}
        title="Avancer d'une génération"
        className="button-secondary px-3 py-1.5 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <SkipForward className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-1 mx-2">
        {SPEED_TIERS.map((tier) => (
          <button
            key={tier}
            onClick={() => handleTier(tier)}
            disabled={disabled}
            className={`px-2.5 py-1.5 rounded-md text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
              activeTier === tier ? 'bg-primary-950 text-primary-300' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {tier}x
          </button>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={disabled || isSaving}
        title="Sauvegarder (sans arrêter)"
        className="button-secondary px-3 py-1.5 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Save className="w-4 h-4" />
      </button>

      <button
        onClick={() => stopCurrentSimulation()}
        disabled={disabled}
        title="Arrêter la simulation (sauvegarde automatiquement)"
        className="button-danger px-3 py-1.5 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Square className="w-4 h-4" />
      </button>
    </footer>
  )
}
