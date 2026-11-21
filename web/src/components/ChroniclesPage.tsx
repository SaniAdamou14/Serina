import { useMemo, useState } from 'react'
import { useGameLog } from '@services/GameLogContext'
import { EVENT_LABELS, MAJOR_IMPORTANCE } from '../hooks/useEcologicalEvents'
import { EventIcon } from './AlertStack'

type Filter = 'all' | 'major' | 'speciation' | 'extinction' | 'decline' | 'intervention'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Tout' },
  { id: 'major', label: 'Majeurs' },
  { id: 'speciation', label: 'Spéciations' },
  { id: 'extinction', label: 'Extinctions' },
  { id: 'decline', label: 'Déclins' },
  { id: 'intervention', label: 'Interventions' }
]

/** Onglet Chroniques : la mémoire du monde, du plus récent au plus ancien. */
export function ChroniclesPage() {
  const { chronicle } = useGameLog()
  const [filter, setFilter] = useState<Filter>('all')

  const shown = useMemo(
    () => [...chronicle].filter((e) => filter === 'all' || (filter === 'major' ? e.importance >= MAJOR_IMPORTANCE : e.type === filter)).sort((a, b) => b.generation - a.generation),
    [chronicle, filter]
  )

  return (
    <>
      <div className="flex items-center gap-0.5">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={`game-button px-3 py-0.5 text-xs ${filter === f.id ? 'game-button-active' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-2 text-xs text-slate-400">{shown.length} événement(s)</span>
      </div>

      {shown.length === 0 ? (
        <p className="text-xs text-slate-400 p-2">Rien à raconter pour l'instant : aucune espèce n'a encore divergé ni disparu.</p>
      ) : (
        <ol className="text-xs">
          {shown.map((event) => (
            <li key={event.id} className="flex items-start gap-2 px-2 py-1 border-b border-slate-700 odd:bg-slate-950/25">
              <span className="w-20 shrink-0 text-right tabular-nums text-slate-400">Tick {event.generation.toLocaleString()}</span>
              <EventIcon
                type={event.type}
                className={`w-3.5 h-3.5 shrink-0 ${event.type === 'extinction' ? 'text-red-300' : event.type === 'decline' ? 'text-orange-300' : event.type === 'intervention' ? 'text-amber-300' : 'text-primary-300'}`}
              />
              <span className="w-20 shrink-0 font-semibold">{EVENT_LABELS[event.type]}</span>
              <span className={`break-words min-w-0 ${event.importance >= MAJOR_IMPORTANCE ? 'font-semibold text-slate-100' : ''}`}>{event.message}</span>
            </li>
          ))}
        </ol>
      )}
    </>
  )
}
