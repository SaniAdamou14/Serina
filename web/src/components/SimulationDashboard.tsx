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
  const isMapTab = activeTab === 'map'

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Barre supérieure fine : logo, onglets et statut regroupés sur une
          seule ligne pour laisser le plus de place possible à la carte
          plutôt qu'un grand en-tête + une barre d'onglets séparée. */}
      <header className="bg-white shadow-sm border-b border-gray-200 shrink-0">
        <div className="px-3 sm:px-4">
          <div className="flex items-center justify-between h-12 gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-lg">🌍</span>
                <h1 className="text-sm font-bold text-gradient hidden sm:block whitespace-nowrap">Serina</h1>
              </div>
              <nav className="flex items-center gap-1 overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors duration-150 ${
                      activeTab === tab.id
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span className="hidden md:inline">{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className={`status-indicator ${isConnected ? 'status-running' : 'status-stopped'}`}>
                <div className={`w-2 h-2 rounded-full mr-1.5 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="hidden lg:inline">{isConnected ? 'Connecté' : 'Déconnecté'}</span>
              </div>
              <div className={`status-indicator ${isRunning ? 'status-running' : 'status-paused'}`}>
                {isRunning ? '▶️' : '⏸️'}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Contenu principal : la carte occupe tout l'espace restant façon
          RimWorld (les panneaux flottent par-dessus, voir WorldMap.tsx) ;
          les autres onglets gardent la disposition classique en grille. */}
      {isMapTab ? (
        <div className="flex-1 relative min-h-0">
          <WorldMap />
          <div className="absolute top-3 left-3 z-20 w-72 max-h-[calc(100%-1.5rem)] overflow-y-auto">
            <SimulationControl />
          </div>
        </div>
      ) : (
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1">
                <SimulationControl />
              </div>

              <div className="lg:col-span-3">
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
          </div>
        </main>
      )}

      {/* Barre de statut, fine, toujours visible */}
      <footer className="bg-white border-t border-gray-200 px-4 py-1.5 shrink-0">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-4">
            <span>🕒 Génération : {status?.generation ?? 0}</span>
            <span>👥 Population : {status?.population ?? 0}</span>
            <span>🐾 Espèces : {status?.speciesCount ?? 0}</span>
          </div>
          <div className="flex items-center space-x-4">
            <span>🌱 Spéciations : {status?.speciationEventCount ?? 0}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
