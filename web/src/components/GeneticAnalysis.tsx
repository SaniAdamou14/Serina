import { useSimulation } from '@services/SimulationContext'
import { useState } from 'react'

const SPECIES_ORIGIN_STORIES: Record<string, string> = {
  canaria: 'Descendant direct des canaris originaux introduits sur Serina.',
  xiphophorus: 'Lignée des porte-épées, colonisant les eaux douces.',
  poecilia: 'Famille des guppys, diversifiée dans les zones humides.',
  gryllus: 'Grillons adaptés aux prairies et zones herbacées.',
  solenopsis: 'Fourmis de feu colonisant les sols riches.',
  achatina: 'Escargots géants des forêts humides de Serina.'
}

function getSpeciesOrigin(name: string): string {
  const key = Object.keys(SPECIES_ORIGIN_STORIES).find((k) => name.toLowerCase().includes(k))
  return key ? SPECIES_ORIGIN_STORIES[key] : 'Espèce endémique évoluée sur Serina.'
}

function gaugeColor(value: number): string {
  if (value >= 0.8) return 'text-green-600 bg-green-100'
  if (value >= 0.6) return 'text-blue-600 bg-blue-100'
  if (value >= 0.4) return 'text-yellow-600 bg-yellow-100'
  if (value >= 0.2) return 'text-orange-600 bg-orange-100'
  return 'text-red-600 bg-red-100'
}

export function GeneticAnalysis() {
  const { simulationData } = useSimulation()
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null)

  if (!simulationData || simulationData.status.species.length === 0) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">🧬 Analyse Génétique — Serina</h3>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
        <p className="text-gray-500 mt-4">En attente des données d'évolution...</p>
      </div>
    )
  }

  const species = simulationData.status.species
  const genetics = simulationData.genetics.species
  const current = (selectedSpecies ? species.find((s) => s.name === selectedSpecies) : species[0]) ?? species[0]
  const currentGenetics = genetics.find((g) => g.name === current.name)

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold">🧬 Analyse Génétique — Monde de Serina</h3>
        {species.length > 1 && (
          <select
            value={current.name}
            onChange={(e) => setSelectedSpecies(e.target.value)}
            className="px-3 py-1 border rounded-md text-sm"
          >
            {species.map((s) => (
              <option key={s.name} value={s.name}>{s.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-semibold text-blue-800">{current.name}</h4>
        <p className="text-sm text-blue-600 mt-1">{getSpeciesOrigin(current.name)}</p>
        <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
          <div>
            <span className="font-medium">Population :</span> {current.population.toLocaleString()}
          </div>
          <div>
            <span className="font-medium">Fitness moyenne :</span> {(current.fitness * 100).toFixed(0)}%
          </div>
          <div>
            <span className="font-medium">Générations sans innovation :</span> {currentGenetics?.generationsSinceLastInnovation ?? '—'}
          </div>
          <div>
            <span className="font-medium">Risque d'extinction :</span>{' '}
            <span className={`ml-1 px-2 py-1 rounded text-xs ${
              current.extinctionRisk > 0.7 ? 'bg-red-100 text-red-700' :
              current.extinctionRisk > 0.4 ? 'bg-yellow-100 text-yellow-700' :
              'bg-green-100 text-green-700'
            }`}>
              {(current.extinctionRisk * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      {/* Diversité génétique et fitness — les deux seules métriques agrégées
          que le moteur calcule réellement par espèce. */}
      <h4 className="font-semibold mb-4">📊 Profil génétique agrégé</h4>
      <div className="space-y-3 mb-6">
        {[
          { label: 'Diversité génétique', value: current.geneticDiversity },
          { label: 'Fitness moyenne', value: current.fitness }
        ].map(({ label, value }) => (
          <div key={label} className="p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center mb-1">
              <span className="font-medium text-sm">{label}</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${gaugeColor(value)}`}>
                {(value * 100).toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{ width: `${Math.min(100, value * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Adaptations et innovations réellement acquises par cette espèce */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold mb-2 text-sm">🌱 Adaptations acquises</h4>
          {current.adaptations.length > 0 ? (
            <ul className="space-y-1">
              {current.adaptations.map((a) => (
                <li key={a} className="text-xs bg-green-50 text-green-700 rounded px-2 py-1">{a}</li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-500">Aucune adaptation acquise pour l'instant</p>
          )}
        </div>
        <div>
          <h4 className="font-semibold mb-2 text-sm">🚀 Innovations évolutives</h4>
          {current.innovations.length > 0 ? (
            <ul className="space-y-1">
              {current.innovations.map((i) => (
                <li key={i} className="text-xs bg-purple-50 text-purple-700 rounded px-2 py-1">{i}</li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-500">Aucune innovation développée pour l'instant</p>
          )}
        </div>
      </div>

      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <h5 className="font-semibold text-amber-800 mb-2">🌍 Contexte évolutif — Serina</h5>
        <p className="text-sm text-amber-700">
          Cette espèce évolue dans le monde de Serina, un écosystème unique où seuls quelques oiseaux,
          insectes, poissons et invertébrés ont colonisé une planète vierge. La diversité génétique et
          la fitness reflètent la pression sélective réelle exercée par cet environnement.
        </p>
      </div>
    </div>
  )
}
