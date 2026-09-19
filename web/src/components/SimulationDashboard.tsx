import { useState } from 'react'
import { SimulationControl } from './SimulationControl'
import { PopulationChart } from './PopulationChart'
import { GeneticAnalysis } from './GeneticAnalysis'
import { EnvironmentView } from './EnvironmentView'
import { SpeciesPanel } from './SpeciesPanel'
import { EngineStatus } from './PerformanceMetrics'
import { SpeciesEvolutionTree } from './SpeciesEvolutionTree'
import { WorldMap } from './WorldMap'
import { useSimulation } from '@services/SimulationContext'

export function SimulationDashboard() {
  const { simulationData, isConnected, isRunning } = useSimulation()
  const [activeTab, setActiveTab] = useState<'map' | 'overview' | 'genetics' | 'evolution' | 'species'>('map')

  const tabs = [
    { id: 'map', label: 'Carte', icon: '🗺️' },
    { id: 'overview', label: 'Vue d\'ensemble', icon: '📊' },
    { id: 'evolution', label: 'Arbre Évolutif', icon: '🌳' },
    { id: 'genetics', label: 'Génétique', icon: '🧬' },
    { id: 'species', label: 'Espèces', icon: '🐾' }
  ] as const

  const status = simulationData?.status

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="text-2xl">🌍</div>
              <div>
                <h1 className="text-xl font-bold text-gradient">Serina - L'Histoire Naturelle d'un Monde d'Oiseaux</h1>
                <p className="text-xs text-gray-500">Simulateur d'Évolution Authentique</p>
              </div>
            </div>

            {/* Connection Status */}
            <div className="flex items-center space-x-4">
              <div className={`status-indicator ${isConnected ? 'status-running' : 'status-stopped'}`}>
                <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                {isConnected ? 'Connecté à Serina' : 'Déconnecté'}
              </div>

              <div className={`status-indicator ${isRunning ? 'status-running' : 'status-paused'}`}>
                {isRunning ? '▶️ Évolution en cours' : '⏸️ Simulation en pause'}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Control Panel - Always Visible */}
          <div className="lg:col-span-1">
            <SimulationControl />
          </div>

          {/* Dynamic Content Based on Active Tab */}
          <div className="lg:col-span-3">
            {activeTab === 'map' && (
              <div className="space-y-6">
                <WorldMap />
              </div>
            )}

            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <PopulationChart />
                  <EngineStatus />
                </div>
                <EnvironmentView showDetails />
              </div>
            )}

            {activeTab === 'evolution' && (
              <div className="space-y-6">
                <SpeciesEvolutionTree />
              </div>
            )}

            {activeTab === 'genetics' && (
              <div className="space-y-6">
                <GeneticAnalysis />
              </div>
            )}

            {activeTab === 'species' && (
              <div className="space-y-6">
                <SpeciesPanel />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Status Bar */}
      <footer className="bg-white border-t border-gray-200 px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center space-x-4">
            <span>🕒 Génération : {status?.generation ?? 0}</span>
            <span>👥 Population : {status?.population ?? 0}</span>
            <span>🐾 Espèces : {status?.speciesCount ?? 0}</span>
            <span>🌍 Monde de Serina</span>
          </div>
          <div className="flex items-center space-x-4">
            <span>🌱 Spéciations : {status?.speciationEventCount ?? 0}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
