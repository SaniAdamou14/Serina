import { useState } from 'react'
import { Map as MapIcon, BarChart3, GitBranch, Dna, PawPrint, Globe2, PanelLeftClose, PanelLeftOpen, Play, Pause, Clock, Users, Sprout } from 'lucide-react'
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const tabs = [
    { id: 'map', label: 'Carte', icon: MapIcon },
    { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
    { id: 'evolution', label: 'Arbre Évolutif', icon: GitBranch },
    { id: 'genetics', label: 'Génétique', icon: Dna },
    { id: 'species', label: 'Espèces', icon: PawPrint }
  ] as const

  const status = simulationData?.status
  const isMapTab = activeTab === 'map'

  return (
    <div className="h-screen flex flex-col bg-slate-950 overflow-hidden">
      {/* Barre supérieure fine : logo, onglets et statut regroupés sur une
          seule ligne pour laisser le plus de place possible à la carte
          plutôt qu'un grand en-tête + une barre d'onglets séparée. */}
      <header className="bg-slate-900 shadow-lg border-b border-slate-700 shrink-0">
        <div className="px-3 sm:px-4">
          <div className="flex items-center justify-between h-12 gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="flex items-center gap-2 shrink-0">
                <Globe2 className="w-5 h-5 text-primary-400" />
                <h1 className="text-sm font-bold text-gradient hidden sm:block whitespace-nowrap">Serina</h1>
              </div>
              <nav className="flex items-center gap-1 overflow-x-auto">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors duration-150 ${
                        activeTab === tab.id
                          ? 'bg-primary-950 text-primary-300'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden md:inline">{tab.label}</span>
                    </button>
                  )
                })}
              </nav>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isMapTab && (
                <button
                  onClick={() => setSidebarCollapsed((v) => !v)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  title={sidebarCollapsed ? 'Afficher le panneau de contrôle' : 'Masquer le panneau de contrôle'}
                >
                  {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                  <span className="hidden lg:inline">Contrôles</span>
                </button>
              )}
              <div className={`status-indicator ${isConnected ? 'status-running' : 'status-stopped'}`}>
                <div className={`w-2 h-2 rounded-full mr-1.5 ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                <span className="hidden lg:inline">{isConnected ? 'Connecté' : 'Déconnecté'}</span>
              </div>
              <div className={`status-indicator ${isRunning ? 'status-running' : 'status-paused'}`}>
                {isRunning ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Contenu principal : la carte occupe tout l'espace restant façon
          RimWorld (seules de petites info-bulles flottent par-dessus, voir
          WorldMap.tsx) ; le panneau de contrôle est ancré à côté d'elle
          (une vraie colonne qui réduit l'espace de la carte, jamais une
          superposition qui la cache) et peut se replier pour lui rendre
          toute la largeur. Les autres onglets gardent la disposition
          classique en grille. */}
      {isMapTab ? (
        <div className="flex-1 flex min-h-0">
          {!sidebarCollapsed && (
            <div className="w-72 shrink-0 overflow-y-auto border-r border-slate-700 bg-slate-900 p-3">
              <SimulationControl />
            </div>
          )}
          <div className="flex-1 relative min-h-0">
            <WorldMap />
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
      <footer className="bg-slate-900 border-t border-slate-700 px-4 py-1.5 shrink-0">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-4">
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Génération : {status?.generation ?? 0}</span>
            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Population : {status?.population ?? 0}</span>
            <span className="flex items-center gap-1"><PawPrint className="w-3.5 h-3.5" /> Espèces : {status?.speciesCount ?? 0}</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="flex items-center gap-1"><Sprout className="w-3.5 h-3.5" /> Spéciations : {status?.speciationEventCount ?? 0}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
