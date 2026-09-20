import { IndividualInfo } from '../types'

/** Moyenne réelle des canaux visuels (voir IndividualSnapshot côté C++) sur
 * un ensemble d'individus vivants -- un portrait généré à partir de ceci
 * montre donc ce qu'une espèce EST vraiment en ce moment, jamais un idéal
 * figé. Les paliers entiers (ornementation, motifs) sont arrondis plutôt
 * que moyennés en flottant, pour rester des paliers discrets cohérents
 * avec ce que CreatureIcon sait dessiner. Partagé entre SpeciesDetailPanel
 * (portrait détaillé) et SpeciesPanel (petite vignette par carte). */
export function averageVisual(individuals: IndividualInfo[]): Omit<IndividualInfo, 'id' | 'species' | 'x' | 'y' | 'energy' | 'age'> | null {
  if (individuals.length === 0) return null
  const n = individuals.length
  const sum = individuals.reduce(
    (acc, ind) => ({
      biologicalType: ind.biologicalType,
      sizeScale: acc.sizeScale + ind.sizeScale,
      elongation: acc.elongation + ind.elongation,
      camouflage: acc.camouflage + ind.camouflage,
      ornamentTier: acc.ornamentTier + ind.ornamentTier,
      sensoryProminence: acc.sensoryProminence + ind.sensoryProminence,
      patternTier: acc.patternTier + ind.patternTier
    }),
    { biologicalType: individuals[0].biologicalType, sizeScale: 0, elongation: 0, camouflage: 0, ornamentTier: 0, sensoryProminence: 0, patternTier: 0 }
  )
  return {
    biologicalType: sum.biologicalType,
    sizeScale: sum.sizeScale / n,
    elongation: sum.elongation / n,
    camouflage: sum.camouflage / n,
    ornamentTier: Math.round(sum.ornamentTier / n),
    sensoryProminence: sum.sensoryProminence / n,
    patternTier: Math.round(sum.patternTier / n)
  }
}
