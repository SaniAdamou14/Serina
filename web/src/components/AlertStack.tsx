import { RefreshCw, Rocket, Skull, WifiOff, X, Hand, TrendingDown } from 'lucide-react'
import { EcoEvent, EVENT_LABELS, MAJOR_IMPORTANCE } from '../hooks/useEcologicalEvents'
import { useSimulation } from '@services/SimulationContext'
import { useGameLog } from '@services/GameLogContext'

/**
 * Bord droit de l'écran, façon RimWorld : les alertes durables (perte de connexion,
 * extinction totale) puis les lettres d'événements réellement détectés.
 */
const EVENT_TINTS: Record<EcoEvent['type'], string> = {
  extinction: 'text-red-200',
  decline: 'text-orange-200',
  intervention: 'text-amber-200',
  speciation: 'text-primary-300'
}

/** L'icône d'un type d'événement, partagée avec les Chroniques. */
export function EventIcon({ type, className }: { type: EcoEvent['type']; className: string }) {
  if (type === 'extinction') return <Skull className={className} />
  if (type === 'decline') return <TrendingDown className={className} />
  if (type === 'intervention') return <Hand className={className} />
  return <Rocket className={className} />
}

export function AlertStack() {
  const { simulationData, currentSimulationId, isConnected, connect } = useSimulation()
  const { letters: events, dismissLetter: dismiss } = useGameLog()
  const isExtinct = !!currentSimulationId && simulationData?.status.population === 0

  return (
    <div className="absolute top-44 right-2 bottom-56 z-20 w-60 flex flex-col items-end gap-1 overflow-hidden pointer-events-none">
      {!isConnected && (
        <button className="game-panel pointer-events-auto w-full px-2 py-1.5 text-xs text-left flex items-center gap-2 text-red-300" onClick={connect} title="Reconnecter">
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          <span className="flex-1 font-semibold">Serveur déconnecté</span>
          <RefreshCw className="w-3.5 h-3.5 shrink-0" />
        </button>
      )}

      {isExtinct && (
        <div className="game-panel pointer-events-auto w-full px-2 py-1.5 text-xs flex items-center gap-2 text-red-300" title="La simulation s'est mise en pause automatiquement">
          <Skull className="w-3.5 h-3.5 shrink-0" />
          <span className="font-semibold">Écosystème éteint</span>
        </div>
      )}

      {events.map((event) => (
        <div
          key={event.id}
          className={`game-panel pointer-events-auto w-full px-2 py-1.5 text-xs flex items-start gap-2 ${EVENT_TINTS[event.type]} ${event.importance >= MAJOR_IMPORTANCE ? 'border-l-2 border-l-red-400' : ''}`}
        >
          <EventIcon type={event.type} className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="font-semibold">{EVENT_LABELS[event.type]}, tick {event.generation}</div>
            <div className="text-slate-300 break-words">{event.message}</div>
          </div>
          <button className="opacity-60 hover:opacity-100 shrink-0" onClick={() => dismiss(event.id)} aria-label="Fermer la lettre">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
