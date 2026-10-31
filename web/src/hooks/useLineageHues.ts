import { useMemo } from 'react'
import { useSimulation } from '@services/SimulationContext'
import { computeLineageHues } from '../utils/lineageColor'

/** Teinte de chaque lignée, la même partout dans l'interface. */
export function useLineageHues() {
  const { simulationData } = useSimulation()
  const events = simulationData?.lineages.speciationEvents
  const lineages = simulationData?.status.lineages
  return useMemo(
    () => computeLineageHues(events ?? [], (lineages ?? []).map((l) => l.speciesName)),
    [events, lineages]
  )
}
