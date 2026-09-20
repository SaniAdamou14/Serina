import { useState } from 'react'
import { TopBar } from './TopBar'
import { BottomBar } from './BottomBar'
import { LeftRail, DashboardTab } from './LeftRail'
import { InspectorPanel } from './InspectorPanel'
import { SimulationControl } from './SimulationControl'
import { PopulationChart } from './PopulationChart'
import { GeneticAnalysis } from './GeneticAnalysis'
import { EnvironmentView } from './EnvironmentView'
import { SpeciesPanel } from './SpeciesPanel'
import { EngineStatus } from './PerformanceMetrics'
import { SpeciesEvolutionTree } from './SpeciesEvolutionTree'
import { HistoryView } from './HistoryView'
import { WorldMap } from './WorldMap'
import { SpeciesDetailPanel } from './SpeciesDetailPanel'
import { useSimulation } from '@services/SimulationContext'
import { useSelection } from '@services/SelectionContext'

/**
 * Squelette de disposition façon RimWorld (Chantier E1) : barre du haut et
 * barre du bas fixes (TopBar/BottomBar, toujours visibles), rail de
 * navigation à gauche (LeftRail, remplace les anciens onglets horizontaux),
 * panneau d'inspection ancré à droite de la carte (InspectorPanel, remplace
 * les popups flottantes qui vivaient dans WorldMap.tsx). Tant qu'aucune
 * simulation n'est active, seul l'écran de configuration (SimulationControl)
 * est affiché -- l'équivalent de l'écran de création de colonie.
 */
export function SimulationDashboard() {
  const { currentSimulationId } = useSimulation()
  const { detailSpecies, showSpeciesDetail } = useSelection()
  const [activeTab, setActiveTab] = useState<DashboardTab>('map')

  return (
    <div className="h-screen flex flex-col bg-slate-950 overflow-hidden">
      <TopBar />

      {!currentSimulationId ? (
        <main className="flex-1 overflow-y-auto flex justify-center p-6">
          {/* items-center retiré volontairement : un flex centré verticalement
              rend le haut du contenu inatteignable dès qu'il dépasse la
              hauteur de la fenêtre (le défilement part du milieu, jamais du
              haut) -- bug réel signalé sur les petites fenêtres. Un simple
              padding vertical centre visuellement sans jamais rien couper. */}
          <div className="w-full max-w-md py-6">
            <SimulationControl />
          </div>
        </main>
      ) : (
        <div className="flex-1 flex min-h-0">
          <LeftRail activeTab={activeTab} onSelectTab={setActiveTab} />

          {activeTab === 'map' ? (
            <div className="flex-1 flex min-h-0">
              <div className="flex-1 relative min-h-0">
                <WorldMap />
              </div>
              <div className="w-80 shrink-0 overflow-y-auto border-l border-slate-700 bg-slate-900 p-4">
                <InspectorPanel />
              </div>
            </div>
          ) : (
            <main className="flex-1 overflow-y-auto">
              <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                {activeTab === 'overview' && (
                  <>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                      <PopulationChart />
                      <EngineStatus />
                    </div>
                    <EnvironmentView showDetails />
                  </>
                )}

                {activeTab === 'evolution' && <SpeciesEvolutionTree />}
                {activeTab === 'genetics' && <GeneticAnalysis />}
                {activeTab === 'species' && <SpeciesPanel />}
                {activeTab === 'history' && <HistoryView />}
              </div>
            </main>
          )}
        </div>
      )}

      <BottomBar />

      {detailSpecies && <SpeciesDetailPanel speciesName={detailSpecies} onClose={() => showSpeciesDetail(null)} />}
    </div>
  )
}
