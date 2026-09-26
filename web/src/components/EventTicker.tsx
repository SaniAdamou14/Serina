import { Rocket, Skull, X } from 'lucide-react'
import { useSimulation } from '@services/SimulationContext'
import { useEcologicalEvents } from '../hooks/useEcologicalEvents'

/**
 * Pile de notifications façon "lettres" RimWorld (Chantier E5), mais
 * strictement factuelle : une spéciation ou une extinction réellement
 * détectée (voir useEcologicalEvents), jamais un événement mis en scène.
 * Flotte au-dessus de tous les onglets, pas seulement la carte -- une
 * extinction reste pertinente qu'on regarde l'historique ou la génétique.
 */
export function EventTicker() {
  const { simulationData, currentSimulationId } = useSimulation()
  const { events, dismiss } = useEcologicalEvents(simulationData, currentSimulationId)

  if (events.length === 0) return null

  return (
    <div className="fixed top-14 right-3 z-40 w-72 space-y-2 pointer-events-none">
      {events.map((event) => (
        <div
          key={event.id}
          className={`pointer-events-auto rounded-lg shadow-lg px-3 py-2 text-xs flex items-start gap-2 backdrop-blur-sm ${
            event.type === 'extinction' ? 'bg-red-950/90 text-red-200 border border-red-800' : 'bg-purple-950/90 text-purple-200 border border-purple-800'
          }`}
        >
          {event.type === 'extinction' ? <Skull className="w-4 h-4 shrink-0 mt-0.5" /> : <Rocket className="w-4 h-4 shrink-0 mt-0.5" />}
          <div className="flex-1">
            <div className="font-semibold">{event.type === 'extinction' ? 'Extinction' : 'Spéciation'} — génération {event.generation}</div>
            <div className="mt-0.5">{event.message}</div>
          </div>
          <button className="opacity-60 hover:opacity-100 shrink-0" onClick={() => dismiss(event.id)}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
