import { useState } from 'react'
import { useSimulation } from '@services/SimulationContext'
import { SimulationCommand } from '../types'

export function SimulationControl() {
  const { isConnected, isRunning, sendCommand, connect, disconnect } = useSimulation()
  const [simulationSpeed, setSimulationSpeed] = useState(1.0)

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
        <h2 className="text-lg font-semibold text-gray-900">Simulation Control</h2>
        <p className="text-sm text-gray-600">Manage ecosystem evolution</p>
      </div>

      {/* Connection Status */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Connection</span>
          <div className={`status-indicator ${isConnected ? 'status-running' : 'status-stopped'}`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={connect}
            disabled={isConnected}
            className="button-secondary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Connect
          </button>
          <button
            onClick={disconnect}
            disabled={!isConnected}
            className="button-secondary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Disconnect
          </button>
        </div>
      </div>

      {/* Simulation Controls */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Simulation</span>
          <div className={`status-indicator ${isRunning ? 'status-running' : 'status-paused'}`}>
            {isRunning ? 'Running' : 'Paused'}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handlePlayPause}
            disabled={!isConnected}
            className={`${isRunning ? 'button-secondary' : 'button-primary'} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isRunning ? '⏸️ Pause' : '▶️ Play'}
          </button>
          <button
            onClick={handleReset}
            disabled={!isConnected}
            className="button-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🔄 Reset
          </button>
        </div>
      </div>

      {/* Speed Control */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">Speed</label>
          <span className="text-sm text-gray-600">{simulationSpeed.toFixed(1)}x</span>
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
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>0.1x</span>
            <span>1.0x</span>
            <span>5.0x</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1">
          {[0.5, 1.0, 2.0].map(speed => (
            <button
              key={speed}
              onClick={() => handleSpeedChange(speed)}
              disabled={!isConnected}
              className={`text-xs py-1 px-2 rounded ${
                simulationSpeed === speed
                  ? 'bg-primary-100 text-primary-700 border border-primary-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700">Quick Actions</h3>
        <div className="space-y-2">
          <button
            disabled={!isConnected}
            className="w-full button-secondary disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            💾 Save State
          </button>
          <button
            disabled={!isConnected}
            className="w-full button-secondary disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            📂 Load State
          </button>
          <button
            disabled={!isConnected}
            className="w-full button-secondary disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            📊 Export Data
          </button>
        </div>
      </div>

      {/* System Info */}
      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">System</h3>
        <div className="space-y-2 text-xs text-gray-600">
          <div className="flex justify-between">
            <span>Engine</span>
            <span className="font-mono">C++20</span>
          </div>
          <div className="flex justify-between">
            <span>Interface</span>
            <span className="font-mono">React 18</span>
          </div>
          <div className="flex justify-between">
            <span>Protocol</span>
            <span className="font-mono">WebSocket</span>
          </div>
        </div>
      </div>
    </div>
  )
}