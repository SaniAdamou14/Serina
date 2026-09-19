import { useState } from 'react'
import { useSimulation } from '@services/SimulationContext'
import { SimulationCommand } from '../types'

const MIN_FOUNDER_COUNT = 5
const MAX_FOUNDER_COUNT = 400
const MIN_TICKS_PER_SECOND = 1
const MAX_TICKS_PER_SECOND = 20

export function SimulationControl() {
  const {
    isConnected,
    isRunning,
    currentSimulationId,
    availableSimulations,
    connectionError,
    sendCommand,
    startNewSimulation,
    stopCurrentSimulation,
    setSpeed,
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

  const handleSpeedChange = async (value: number) => {
    setTicksPerSecond(value)
    if (currentSimulationId) {
      await setSpeed(value)
    }
  }

  const handleStop = async () => {
    try {
      await stopCurrentSimulation()
    } catch (error) {
      console.error('Failed to stop simulation:', error)
    }
  }

  const handlePlayPause = () => {
    sendCommand(isRunning ? SimulationCommand.PAUSE : SimulationCommand.RESUME)
  }

  return (
    <div className="card space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-lg font-semibold text-gray-900">Contrôle de Simulation</h2>
        <p className="text-sm text-gray-600">Gestion de l'évolution écologique</p>
      </div>

      {/* Statut de connexion */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Connexion</span>
          <div className={`status-indicator ${isConnected ? 'status-running' : 'status-stopped'}`}>
            {isConnected ? 'Connecté' : 'Déconnecté'}
          </div>
        </div>

        {connectionError && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-600">{connectionError}</p>
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

      {/* Statut de la simulation */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Simulation Actuelle</span>
          <div className={`status-indicator ${isRunning ? 'status-running' : 'status-stopped'}`}>
            {currentSimulationId ? (isRunning ? 'En cours' : 'En pause') : 'Aucune simulation'}
          </div>
        </div>

        {currentSimulationId && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-sm text-blue-600">ID : {currentSimulationId}</p>
          </div>
        )}

        {!currentSimulationId && (
          <div className="space-y-3 bg-gray-50 border border-gray-200 rounded-md p-3">
            <div>
              <label className="flex items-center justify-between text-xs font-medium text-gray-700 mb-1">
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
              <p className="text-xs text-gray-500 mt-1">5 lignées × {founderCount} = {founderCount * 5} individus au départ</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Graine (optionnel — pour rejouer une génération de carte identique)</label>
              <input
                type="number"
                value={seedInput}
                onChange={(e) => setSeedInput(e.target.value)}
                placeholder="Aléatoire si vide"
                className="w-full text-sm border border-gray-300 rounded-md px-2 py-1"
              />
            </div>

            <div>
              <label className="flex items-center justify-between text-xs font-medium text-gray-700 mb-1">
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
        )}

        {currentSimulationId && isRunning && (
          <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
            <label className="flex items-center justify-between text-xs font-medium text-gray-700 mb-1">
              <span>Vitesse de la simulation</span>
              <span>{ticksPerSecond} génération(s)/s</span>
            </label>
            <input
              type="range"
              min={MIN_TICKS_PER_SECOND}
              max={MAX_TICKS_PER_SECOND}
              value={ticksPerSecond}
              onChange={(e) => handleSpeedChange(Number(e.target.value))}
              className="w-full"
            />
          </div>
        )}

        <div className="flex space-x-2">
          {!currentSimulationId ? (
            <button
              onClick={handleStartNew}
              disabled={!isConnected || isStarting}
              className="button-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isStarting ? 'Démarrage...' : 'Nouvelle Simulation'}
            </button>
          ) : (
            <>
              <button
                onClick={handlePlayPause}
                disabled={!isConnected}
                className="button-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRunning ? '⏸️ Pause' : '▶️ Reprendre'}
              </button>
              <button
                onClick={handleStop}
                disabled={!isConnected}
                className="button-danger flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🛑 Arrêter
              </button>
            </>
          )}
        </div>
      </div>

      {/* Simulations disponibles */}
      {availableSimulations.length > 0 && (
        <div className="space-y-3">
          <span className="text-sm font-medium text-gray-700">Simulations Disponibles</span>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {availableSimulations.map((sim) => (
              <div key={sim.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-xs text-gray-600">{sim.id}</span>
                <span className={`text-xs px-2 py-1 rounded ${sim.isRunning ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {sim.isRunning ? 'Active' : 'Arrêtée'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Informations système */}
      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Système</h3>
        <div className="space-y-2 text-xs text-gray-600">
          <div className="flex justify-between">
            <span>Backend :</span>
            <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
              {isConnected ? 'En ligne' : 'Hors ligne'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>WebSocket :</span>
            <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
              {isConnected ? 'Actif' : 'Inactif'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
