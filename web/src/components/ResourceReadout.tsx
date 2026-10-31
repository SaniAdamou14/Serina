import { PawPrint, Users, Zap } from 'lucide-react'
import { useSimulation } from '@services/SimulationContext'

/**
 * Relevé en haut à gauche, comme les ressources de RimWorld. Uniquement des chiffres
 * réels : l'énergie totale est la somme des énergies des individus reçus.
 */
export function ResourceReadout() {
  const { simulationData } = useSimulation()
  const status = simulationData?.status
  if (!status) return null

  const totalEnergy = simulationData.individuals.individuals.reduce((sum, i) => sum + i.energy, 0)
  const rows = [
    { icon: Users, label: 'Population', value: status.population.toLocaleString() },
    { icon: PawPrint, label: 'Espèces', value: status.speciesCount.toLocaleString() },
    { icon: Zap, label: 'Énergie totale', value: Math.round(totalEnergy).toLocaleString() }
  ]

  return (
    <div className="absolute top-2 left-2 z-20 w-36 game-panel px-2 py-1 text-xs space-y-0.5">
      {rows.map(({ icon: Icon, label, value }) => (
        <div key={label} className="flex items-center justify-between" title={label}>
          <Icon className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold">{value}</span>
        </div>
      ))}
    </div>
  )
}
