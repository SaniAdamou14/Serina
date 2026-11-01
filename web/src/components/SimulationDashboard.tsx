import { useCallback, useEffect, useState } from 'react'
import { useSimulation } from '@services/SimulationContext'
import { useSelection } from '@services/SelectionContext'
import { SimulationCommand } from '../types'
import { AlertStack } from './AlertStack'
import { ChroniclesPage } from './ChroniclesPage'
import { ErrorBoundary } from './ErrorBoundary'
import { GameTooltip } from './GameTooltip'
import { GameWindow } from './GameWindow'
import { GeneticAnalysis } from './GeneticAnalysis'
import { GraphsPage } from './GraphsPage'
import { InspectorPanel } from './InspectorPanel'
import { LineageBar } from './LineageBar'
import { MAIN_TABS, MainTab, SPEED_TIERS } from './gameConstants'
import { MainTabBar } from './MainTabBar'
import { EngineStatus } from './PerformanceMetrics'
import { ResourceReadout } from './ResourceReadout'
import { SimulationControl } from './SimulationControl'
import { SpeciesComparisonPanel } from './SpeciesComparisonPanel'
import { SpeciesDetailPanel } from './SpeciesDetailPanel'
import { SpeciesEvolutionTree } from './SpeciesEvolutionTree'
import { SpeciesPanel } from './SpeciesPanel'
import { TimeControls } from './TimeControls'
import { WorldMap } from './WorldMap'
import { WorldPage } from './WorldPage'

function tabContent(tab: MainTab) {
  switch (tab) {
    case 'species':
      return <SpeciesPanel />
    case 'evolution':
      return <SpeciesEvolutionTree />
    case 'genetics':
      return <GeneticAnalysis />
    case 'world':
      return <WorldPage />
    case 'graphs':
      return <GraphsPage />
    case 'chronicles':
      return <ChroniclesPage />
    case 'menu':
      return (
        <>
          <SimulationControl />
          <EngineStatus />
        </>
      )
  }
}

/**
 * Coquille façon RimWorld : la carte occupe tout l'écran et tout le reste se pose
 * dessus. Sans simulation active, seul l'écran de création du monde est affiché.
 */
export function SimulationDashboard() {
  const { currentSimulationId, isRunning, isConnected, simulationData, sendCommand, setSpeed, stepSimulation, saveSnapshot } = useSimulation()
  const { detailSpecies, showSpeciesDetail, compareOpen, setCompareOpen, clearSelection } = useSelection()
  const [activeTab, setActiveTab] = useState<MainTab | null>(null)
  const [busy, setBusy] = useState(false)

  const canControl = isConnected && !!currentSimulationId

  const togglePause = useCallback(() => {
    sendCommand(isRunning ? SimulationCommand.PAUSE : SimulationCommand.RESUME)
  }, [isRunning, sendCommand])

  // Comme dans RimWorld : choisir une vitesse relance le temps s'il était en pause.
  const changeSpeed = useCallback(async (ticksPerSecond: number) => {
    await setSpeed(ticksPerSecond)
    if (!isRunning) sendCommand(SimulationCommand.RESUME)
  }, [isRunning, sendCommand, setSpeed])

  const runExclusive = async (action: () => Promise<void>) => {
    setBusy(true)
    try {
      await action()
    } catch {
      // connectionError est déjà mis à jour par SimulationContext.
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!currentSimulationId) return

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      // Une touche maintenue se répète : elle basculerait la pause en boucle.
      if (e.repeat) return

      // La touche physique : sur un clavier AZERTY, le 1 sans Maj envoie « & ».
      const speedKey = /^(?:Digit|Numpad)([1-9])$/.exec(e.code)

      if (e.key === ' ') {
        e.preventDefault()
        // Sinon Espace activerait aussi le dernier bouton cliqué.
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
        if (canControl) togglePause()
      } else if (e.key === 'Escape') {
        if (compareOpen) setCompareOpen(false)
        else if (detailSpecies) showSpeciesDetail(null)
        else if (activeTab) setActiveTab(null)
        else clearSelection()
      } else if (speedKey) {
        const tier = SPEED_TIERS[Number(speedKey[1]) - 1]
        if (canControl && tier) changeSpeed(tier)
      } else {
        const tab = MAIN_TABS.find((t) => t.hotkey === e.key.toUpperCase())
        if (tab) setActiveTab((current) => (current === tab.id ? null : tab.id))
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [currentSimulationId, canControl, togglePause, changeSpeed, compareOpen, detailSpecies, activeTab, setCompareOpen, showSpeciesDetail, clearSelection])

  if (!currentSimulationId) {
    return (
      <div className="fixed inset-0 overflow-y-auto bg-slate-950 flex justify-center p-6">
        <div className="w-full max-w-md py-6 h-fit">
          <h1 className="text-3xl font-bold text-center mb-6">Serina</h1>
          <SimulationControl />
        </div>
      </div>
    )
  }

  const activeLabel = MAIN_TABS.find((t) => t.id === activeTab)?.label

  return (
    <div className="fixed inset-0 overflow-hidden bg-slate-950">
      <div className="absolute inset-0">
        <ErrorBoundary fallbackLabel="Carte">
          <WorldMap />
        </ErrorBoundary>
      </div>

      <ResourceReadout />
      <LineageBar />
      <AlertStack />
      <ErrorBoundary fallbackLabel="Inspecteur">
        <InspectorPanel />
      </ErrorBoundary>
      <TimeControls
        activeSpeed={simulationData?.status.ticksPerSecond ?? null}
        onSpeed={changeSpeed}
        onTogglePause={togglePause}
        onStep={() => runExclusive(() => stepSimulation(1))}
        onSave={() => runExclusive(saveSnapshot)}
        busy={busy}
      />

      {activeTab && activeLabel && (
        <GameWindow key={activeTab} title={activeLabel} onClose={() => setActiveTab(null)}>
          {tabContent(activeTab)}
        </GameWindow>
      )}

      <MainTabBar activeTab={activeTab} onSelect={(tab) => setActiveTab((current) => (current === tab ? null : tab))} />

      <ErrorBoundary fallbackLabel="Fiche de l'espèce">
        {detailSpecies && <SpeciesDetailPanel speciesName={detailSpecies} onClose={() => showSpeciesDetail(null)} />}
        {compareOpen && <SpeciesComparisonPanel />}
      </ErrorBoundary>

      <GameTooltip />
    </div>
  )
}
