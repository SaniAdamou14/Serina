import { createContext, useContext, useState, ReactNode, useCallback } from 'react'
import { RegionInfo, IndividualInfo } from '../types'

/**
 * Sélection courante sur la carte, levée hors de WorldMap.tsx pour être
 * consommée à la fois par la carte (surlignage) et par le panneau
 * d'inspection ancré (InspectorPanel.tsx) -- même patron que
 * SimulationContext.tsx. Une seule chose peut être sélectionnée à la fois,
 * comme dans WorldMap.tsx avant ce chantier.
 */
interface SelectionContextType {
  selectedRegion: RegionInfo | null
  selectedIndividual: IndividualInfo | null
  detailSpecies: string | null
  selectRegion: (region: RegionInfo | null) => void
  selectIndividual: (individual: IndividualInfo | null) => void
  showSpeciesDetail: (speciesName: string | null) => void
  clearSelection: () => void
}

const SelectionContext = createContext<SelectionContextType | undefined>(undefined)

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [selectedRegion, setSelectedRegion] = useState<RegionInfo | null>(null)
  const [selectedIndividual, setSelectedIndividual] = useState<IndividualInfo | null>(null)
  const [detailSpecies, setDetailSpecies] = useState<string | null>(null)

  const selectRegion = useCallback((region: RegionInfo | null) => {
    setSelectedRegion(region)
    setSelectedIndividual(null)
  }, [])

  const selectIndividual = useCallback((individual: IndividualInfo | null) => {
    setSelectedIndividual(individual)
    setSelectedRegion(null)
  }, [])

  const showSpeciesDetail = useCallback((speciesName: string | null) => {
    setDetailSpecies(speciesName)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedRegion(null)
    setSelectedIndividual(null)
  }, [])

  return (
    <SelectionContext.Provider
      value={{ selectedRegion, selectedIndividual, detailSpecies, selectRegion, selectIndividual, showSpeciesDetail, clearSelection }}
    >
      {children}
    </SelectionContext.Provider>
  )
}

export function useSelection() {
  const context = useContext(SelectionContext)
  if (context === undefined) {
    throw new Error('useSelection must be used within a SelectionProvider')
  }
  return context
}
