import { AverageTraits, TRAIT_BOUNDS } from '../types'

/** Barre d'un trait réel, normalisée sur ses vraies bornes biologiques
 * (Genetics::TRAIT_BOUNDS côté C++) -- partagée entre SpeciesDetailPanel et
 * GeneticAnalysis pour que le profil génétique complet (les 12 traits)
 * s'affiche identiquement partout où une espèce est inspectée. */
export function TraitBar({ traitKey, value }: { traitKey: keyof AverageTraits; value: number }) {
  const bounds = TRAIT_BOUNDS[traitKey]
  const fraction = Math.max(0, Math.min(1, (value - bounds.min) / (bounds.max - bounds.min)))
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-400 mb-0.5">
        <span>{bounds.label}</span>
        <span>{value.toFixed(2)}</span>
      </div>
      <div className="w-full bg-slate-800 rounded-full h-1.5">
        <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${fraction * 100}%` }} />
      </div>
    </div>
  )
}
