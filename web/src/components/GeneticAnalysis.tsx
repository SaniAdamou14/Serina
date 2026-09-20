import { useSimulation } from '@services/SimulationContext'
import { useState } from 'react'
import { Dna, BarChart3, Sprout, Rocket, Globe2 } from 'lucide-react'

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
  if (value >= 0.8) return 'text-emerald-300 bg-emerald-950'
  if (value >= 0.6) return 'text-blue-300 bg-blue-950'
  if (value >= 0.4) return 'text-amber-300 bg-amber-950'
  if (value >= 0.2) return 'text-orange-300 bg-orange-950'
  return 'text-red-300 bg-red-950'
}

export function GeneticAnalysis() {
  const { simulationData } = useSimulation()
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null)

  if (!simulationData || simulationData.status.lineages.length === 0) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Dna className="w-5 h-5" /> Analyse Génétique — Serina</h3>
        <div className="animate-pulse">
          <div className="h-4 bg-slate-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-4 bg-slate-700 rounded"></div>
            ))}
          </div>
        </div>
        <p className="text-slate-500 mt-4">En attente des données d'évolution...</p>
      </div>
    )
  }

  const lineages = simulationData.status.lineages
  const current = (selectedSpecies ? lineages.find((l) => l.speciesName === selectedSpecies) : lineages[0]) ?? lineages[0]

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2"><Dna className="w-5 h-5" /> Analyse Génétique — Monde de Serina</h3>
        {lineages.length > 1 && (
          <select
            value={current.speciesName}
            onChange={(e) => setSelectedSpecies(e.target.value)}
            className="input-field px-3 py-1 text-sm"
          >
            {lineages.map((l) => (
              <option key={l.speciesName} value={l.speciesName}>{l.speciesName}</option>
            ))}
          </select>
        )}
      </div>

      <div className="mb-6 p-4 bg-blue-950 rounded-lg">
        <h4 className="font-semibold text-blue-200">{current.speciesName}</h4>
        <p className="text-sm text-blue-300 mt-1">{getSpeciesOrigin(current.speciesName)}</p>
        <div className="grid grid-cols-2 gap-4 mt-3 text-sm text-blue-200">
          <div>
            <span className="font-medium">Population :</span> {current.population.toLocaleString()}
          </div>
          <div>
            <span className="font-medium">Fitness moyenne :</span> {(current.averageFitness * 100).toFixed(0)}%
          </div>
          <div>
            <span className="font-medium">Régions occupées :</span> {current.regionsOccupied}
          </div>
          <div>
            <span className="font-medium">Complexité du cerveau (NEAT) :</span>{' '}
            {current.hasBrain ? `${current.brainComplexity} nœuds/connexions` : '—'}
          </div>
        </div>
      </div>

      {/* Diversité génétique et fitness — les deux seules métriques agrégées
          que le moteur calcule réellement par espèce. */}
      <h4 className="font-semibold mb-4 text-slate-200 flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Profil génétique agrégé</h4>
      <div className="space-y-3 mb-6">
        {[
          { label: 'Diversité génétique', value: current.geneticDiversity },
          { label: 'Fitness moyenne', value: current.averageFitness }
        ].map(({ label, value }) => (
          <div key={label} className="p-3 bg-slate-800/60 rounded-lg">
            <div className="flex justify-between items-center mb-1">
              <span className="font-medium text-sm text-slate-300">{label}</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${gaugeColor(value)}`}>
                {(value * 100).toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div className="bg-primary-500 h-2 rounded-full transition-all duration-300" style={{ width: `${Math.min(100, value * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Adaptations et innovations réellement acquises par cette espèce */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold mb-2 text-sm text-slate-200 flex items-center gap-1.5"><Sprout className="w-4 h-4" /> Adaptations acquises</h4>
          {current.adaptations.length > 0 ? (
            <ul className="space-y-1">
              {current.adaptations.map((a) => (
                <li key={a} className="text-xs bg-emerald-950 text-emerald-300 rounded px-2 py-1">{a}</li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500">Aucune adaptation acquise pour l'instant</p>
          )}
        </div>
        <div>
          <h4 className="font-semibold mb-2 text-sm text-slate-200 flex items-center gap-1.5"><Rocket className="w-4 h-4" /> Innovations évolutives</h4>
          {current.innovations.length > 0 ? (
            <ul className="space-y-1">
              {current.innovations.map((i) => (
                <li key={i} className="text-xs bg-genetic-950 text-genetic-300 rounded px-2 py-1">{i}</li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500">Aucune innovation développée pour l'instant</p>
          )}
        </div>
      </div>

      <div className="mt-6 p-4 bg-amber-950 border border-amber-800 rounded-lg">
        <h5 className="font-semibold text-amber-200 mb-2 flex items-center gap-1.5"><Globe2 className="w-4 h-4" /> Contexte évolutif — Serina</h5>
        <p className="text-sm text-amber-300">
          Cette espèce évolue dans le monde de Serina, un écosystème unique où seuls quelques oiseaux,
          insectes, poissons et invertébrés ont colonisé une planète vierge. La diversité génétique et
          la fitness reflètent la pression sélective réelle exercée par cet environnement.
        </p>
      </div>
    </div>
  )
}
