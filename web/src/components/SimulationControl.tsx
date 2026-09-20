import { useState } from 'react'
import { useSimulation } from '@services/SimulationContext'

const MIN_FOUNDER_COUNT = 5
const MAX_FOUNDER_COUNT = 400
const MIN_TICKS_PER_SECOND = 1
const MAX_TICKS_PER_SECOND = 20

/**
 * Écran de configuration affiché uniquement tant qu'aucune simulation n'est
 * active -- l'équivalent de l'écran de création de colonie de RimWorld.
 * Une fois une simulation démarrée, ce composant disparaît : le contrôle en
 * direct (vitesse, pause, pas-à-pas, arrêt) vit désormais dans BottomBar.tsx
 * et TopBar.tsx, toujours visibles quel que soit l'onglet actif.
 */
export function SimulationControl() {
  const {
    isConnected,
    currentSimulationId,
    availableSimulations,
    connectionError,
    startNewSimulation,
    connect,
    disconnect
  } = useSimulation()
  const [isStarting, setIsStarting] = useState(false)
  const [founderCount, setFounderCount] = useState(40)
  const [seedInput, setSeedInput] = useState('')
  const [ticksPerSecond, setTicksPerSecond] = useState(4)

  const handleStartNew = async () => {
    try {
      setIsStarting(true)
      const seed = seedInput.trim() === '' ? undefined : Number(seedInput.trim())
      await startNewSimulation({ founderCount, seed, ticksPerSecond })
    } catch (error) {
      console.error('Failed to start simulation:', error)
    } finally {
      setIsStarting(false)
    }
  }

  return (
    <div className="card space-y-6">
      <div className="border-b border-slate-700 pb-4">
        <h2 className="text-lg font-semibold text-slate-100">Nouvelle simulation</h2>
        <p className="text-sm text-slate-400">Configurer et démarrer un nouvel écosystème réel</p>
      </div>

      {/* Statut de connexion */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-300">Connexion</span>
          <div className={`status-indicator ${isConnected ? 'status-running' : 'status-stopped'}`}>
            {isConnected ? 'Connecté' : 'Déconnecté'}
          </div>
        </div>

        {connectionError && (
          <div className="bg-red-950 border border-red-800 rounded-md p-3">
            <p className="text-sm text-red-300">{connectionError}</p>
          </div>
        )}

        <div className="flex space-x-2">
          <button
            onClick={connect}
            disabled={isConnected}
            className="button-secondary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Se Connecter
          </button>
          <button
            onClick={disconnect}
            disabled={!isConnected}
            className="button-secondary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Se Déconnecter
          </button>
        </div>
      </div>

      {/* Configuration de la nouvelle simulation */}
      {!currentSimulationId && (
        <div className="space-y-3">
          <div className="space-y-3 bg-slate-800/60 border border-slate-700 rounded-md p-3">
            <div>
              <label className="flex items-center justify-between text-xs font-medium text-slate-300 mb-1">
                <span>Individus par lignée fondatrice</span>
                <span>{founderCount}</span>
              </label>
              <input
                type="range"
                min={MIN_FOUNDER_COUNT}
                max={MAX_FOUNDER_COUNT}
                value={founderCount}
                onChange={(e) => setFounderCount(Number(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-slate-500 mt-1">5 lignées × {founderCount} = {founderCount * 5} individus au départ</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Graine (optionnel — pour rejouer une génération de carte identique)</label>
              <input
                type="number"
                value={seedInput}
                onChange={(e) => setSeedInput(e.target.value)}
                placeholder="Aléatoire si vide"
                className="input-field w-full text-sm px-2 py-1"
              />
            </div>

            <div>
              <label className="flex items-center justify-between text-xs font-medium text-slate-300 mb-1">
                <span>Vitesse initiale</span>
                <span>{ticksPerSecond} génération(s)/s</span>
              </label>
              <input
                type="range"
                min={MIN_TICKS_PER_SECOND}
                max={MAX_TICKS_PER_SECOND}
                value={ticksPerSecond}
                onChange={(e) => setTicksPerSecond(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          <button
            onClick={handleStartNew}
            disabled={!isConnected || isStarting}
            className="button-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isStarting ? 'Démarrage...' : 'Nouvelle Simulation'}
          </button>
        </div>
      )}

      {/* Simulations disponibles */}
      {availableSimulations.length > 0 && (
        <div className="space-y-3">
          <span className="text-sm font-medium text-slate-300">Simulations Disponibles</span>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {availableSimulations.map((sim) => (
              <div key={sim.id} className="flex items-center justify-between p-2 bg-slate-800/60 rounded">
                <span className="text-xs text-slate-400">{sim.id}</span>
                <span className={`text-xs px-2 py-1 rounded ${sim.isRunning ? 'bg-emerald-950 text-emerald-300' : 'bg-slate-700 text-slate-300'}`}>
                  {sim.isRunning ? 'Active' : 'Arrêtée'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Informations système */}
      <div className="border-t border-slate-700 pt-4">
        <h3 className="text-sm font-medium text-slate-300 mb-3">Système</h3>
        <div className="space-y-2 text-xs text-slate-400">
          <div className="flex justify-between">
            <span>Backend :</span>
            <span className={isConnected ? 'text-emerald-400' : 'text-red-400'}>
              {isConnected ? 'En ligne' : 'Hors ligne'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>WebSocket :</span>
            <span className={isConnected ? 'text-emerald-400' : 'text-red-400'}>
              {isConnected ? 'Actif' : 'Inactif'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
