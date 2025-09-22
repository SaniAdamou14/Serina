import { useState } from 'react'
import { useSimulation } from '../services/SimulationContext'
import { SimulationCommand } from '../types'

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
    connect, 
    disconnect 
  } = useSimulation()
  const [simulationSpeed, setSimulationSpeed] = useState(1.0)
  const [isStarting, setIsStarting] = useState(false)

  const handleStartNew = async () => {
    try {
      setIsStarting(true)
      await startNewSimulation({
        worldWidth: 100,
        worldHeight: 100
      })
    } catch (error) {
      console.error('Failed to start simulation:', error)
    } finally {
      setIsStarting(false)
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
    if (isRunning) {
      sendCommand(SimulationCommand.PAUSE)
    } else {
      sendCommand(SimulationCommand.START)
    }
  }

  const handleReset = () => {
    sendCommand(SimulationCommand.RESET)
  }

  const handleSpeedChange = (speed: number) => {
    setSimulationSpeed(speed)
    sendCommand(SimulationCommand.SET_SPEED, { speed })
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
            <p className="text-sm text-blue-600">ID: {currentSimulationId}</p>
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
              <div key={sim.simulationId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-xs text-gray-600">{sim.simulationId}</span>
                <span className={`text-xs px-2 py-1 rounded ${sim.isRunning ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {sim.isRunning ? 'Active' : 'Arrêtée'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contrôle de vitesse */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">Vitesse</label>
          <span className="text-sm text-gray-600">{simulationSpeed}x</span>
        </div>
        
        <div className="space-y-2">
          <input
            type="range"
            min="0.1"
            max="5.0"
            step="0.1"
            value={simulationSpeed}
            onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
            disabled={!isConnected}
            className="w-full accent-blue-600 disabled:opacity-50"
          />
          
          <div className="flex justify-between text-xs text-gray-500">
            <span>0.1x</span>
            <span>1x</span>
            <span>5x</span>
          </div>
        </div>
        
        <div className="flex space-x-2">
          {[0.5, 1.0, 2.0, 5.0].map(speed => (
            <button
              key={speed}
              onClick={() => handleSpeedChange(speed)}
              disabled={!isConnected}
              className={`px-2 py-1 text-xs rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                simulationSpeed === speed 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>

      {/* Actions rapides */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700">Actions Rapides</h3>
        <div className="space-y-2">
          <button
            onClick={handleReset}
            disabled={!isConnected}
            className="w-full button-warning disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🔄 Réinitialiser
          </button>
          
          <button
            onClick={() => sendCommand(SimulationCommand.SAVE)}
            disabled={!isConnected || !currentSimulationId}
            className="w-full button-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            💾 Sauvegarder État
          </button>
        </div>
      </div>

      {/* Informations système */}
      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Système</h3>
        <div className="space-y-2 text-xs text-gray-600">
          <div className="flex justify-between">
            <span>Backend:</span>
            <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
              {isConnected ? 'En ligne' : 'Hors ligne'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>WebSocket:</span>
            <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
              {isConnected ? 'Actif' : 'Inactif'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}