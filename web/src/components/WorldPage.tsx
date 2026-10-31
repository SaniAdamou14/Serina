import { useMemo } from 'react'
import { useSimulation } from '@services/SimulationContext'
import { GameColumn, GameTable } from './GameTable'

interface BiomeRow {
  name: string
  cells: number
  individuals: number
  species: number
  temperature: number
  producers: number
  predation: number
  competition: number
  stress: number
}

const percent = (value: number) => `${(value * 100).toFixed(0)} %`

/** Onglet Monde : les biomes de la carte, leur climat et qui y vit. */
export function WorldPage() {
  const { simulationData } = useSimulation()
  const regions = simulationData?.regions
  const individuals = simulationData?.individuals.individuals

  const rows = useMemo<BiomeRow[]>(() => {
    if (!regions || !individuals) return []
    const { gridWidth, gridHeight, cellSize } = regions
    const biomeOfCell = new Array<string>(gridWidth * gridHeight)
    const byName = new Map<string, BiomeRow>()
    for (const r of regions.regions) {
      biomeOfCell[r.gridY * gridWidth + r.gridX] = r.environmentName
      const row = byName.get(r.environmentName)
      if (row) {
        row.cells++
        row.individuals += r.population
      } else {
        byName.set(r.environmentName, {
          name: r.environmentName,
          cells: 1,
          individuals: r.population,
          species: 0,
          temperature: r.temperature,
          producers: r.primaryProducers,
          predation: r.predationPressure,
          competition: r.competitionIntensity,
          stress: r.climaticStress
        })
      }
    }

    const speciesByBiome = new Map<string, Set<string>>()
    for (const ind of individuals) {
      const gx = Math.max(0, Math.min(gridWidth - 1, Math.floor(ind.x / cellSize)))
      const gy = Math.max(0, Math.min(gridHeight - 1, Math.floor(ind.y / cellSize)))
      const biome = biomeOfCell[gy * gridWidth + gx]
      let set = speciesByBiome.get(biome)
      if (!set) speciesByBiome.set(biome, (set = new Set()))
      set.add(ind.species)
    }
    for (const row of byName.values()) row.species = speciesByBiome.get(row.name)?.size ?? 0
    return [...byName.values()]
  }, [regions, individuals])

  if (!regions) return null

  const columns: GameColumn<BiomeRow>[] = [
    { key: 'name', label: 'Biome', value: (r) => r.name, render: (r) => <span className="font-semibold">{r.name}</span> },
    { key: 'cells', label: 'Cases', align: 'right', value: (r) => r.cells },
    { key: 'individuals', label: 'Individus', align: 'right', value: (r) => r.individuals, render: (r) => r.individuals.toLocaleString() },
    { key: 'density', label: 'Par case', title: 'Individus par case', align: 'right', value: (r) => r.individuals / r.cells, render: (r) => (r.individuals / r.cells).toFixed(0) },
    { key: 'species', label: 'Espèces', align: 'right', value: (r) => r.species },
    { key: 'temperature', label: 'Temp.', title: 'Température moyenne', align: 'right', value: (r) => r.temperature, render: (r) => `${r.temperature.toFixed(0)} °C` },
    { key: 'producers', label: 'Végétation', title: 'Producteurs primaires : nourriture disponible', align: 'right', value: (r) => r.producers, render: (r) => percent(r.producers) },
    { key: 'predation', label: 'Prédation', align: 'right', value: (r) => r.predation, render: (r) => percent(r.predation) },
    { key: 'competition', label: 'Compétition', align: 'right', value: (r) => r.competition, render: (r) => percent(r.competition) },
    { key: 'stress', label: 'Stress', title: "Stress climatique : la résistance idéale pour y vivre", align: 'right', value: (r) => r.stress, render: (r) => percent(r.stress) }
  ]

  return (
    <>
      <p className="text-xs text-slate-300">
        Monde de {regions.gridWidth} cases sur {regions.gridHeight}, {regions.regions.length} cases au total.
      </p>
      <GameTable columns={columns} rows={rows} rowKey={(r) => r.name} defaultSort={{ key: 'cells', descending: true }} />
    </>
  )
}
