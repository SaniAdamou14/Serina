import { useMemo, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { HistorySample, useGameLog } from '@services/GameLogContext'
import { HistoryView } from './HistoryView'

// Palette catégorielle validée sur le fond des panneaux (scripts/validate_palette.js du
// guide dataviz) : ordre fixe, une couleur reste attachée à son espèce.
const SERIES_COLORS = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767']
const OTHERS_COLOR = '#98978f'
const MAX_NAMED_SPECIES = 7

type Metric = 'bySpecies' | 'population' | 'species' | 'energy' | 'diversity'

const METRICS: { id: Metric; label: string; format: (v: number) => string }[] = [
  { id: 'bySpecies', label: 'Population par espèce', format: (v) => Math.round(v).toLocaleString() },
  { id: 'population', label: 'Population totale', format: (v) => Math.round(v).toLocaleString() },
  { id: 'species', label: 'Espèces', format: (v) => Math.round(v).toString() },
  { id: 'energy', label: 'Énergie totale', format: (v) => Math.round(v).toLocaleString() },
  { id: 'diversity', label: 'Diversité génétique', format: (v) => v.toFixed(3) }
]

interface Series {
  name: string
  color: string
  values: number[]
}

const WIDTH = 900
const HEIGHT = 380
const MARGIN = { top: 12, right: 12, bottom: 26, left: 62 }

function niceMax(value: number): number {
  if (value <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const scaled = value / magnitude
  const step = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10
  return step * magnitude
}

function LiveChart({ history, series, format }: { history: HistorySample[]; series: Series[]; format: (v: number) => string }) {
  const svg = useRef<SVGSVGElement>(null)
  const [hover, setHover] = useState<number | null>(null)

  const firstTick = history[0].tick
  const lastTick = history[history.length - 1].tick
  const span = Math.max(1, lastTick - firstTick)
  const top = niceMax(Math.max(...series.flatMap((s) => s.values)))
  const plotW = WIDTH - MARGIN.left - MARGIN.right
  const plotH = HEIGHT - MARGIN.top - MARGIN.bottom
  const x = (tick: number) => MARGIN.left + ((tick - firstTick) / span) * plotW
  const y = (value: number) => MARGIN.top + plotH - (value / top) * plotH

  const onMove = (e: ReactMouseEvent<SVGSVGElement>) => {
    const rect = svg.current?.getBoundingClientRect()
    if (!rect) return
    const tick = firstTick + (((e.clientX - rect.left) / rect.width) * WIDTH - MARGIN.left) / plotW * span
    let best = 0
    history.forEach((h, i) => {
      if (Math.abs(h.tick - tick) < Math.abs(history[best].tick - tick)) best = i
    })
    setHover(best)
  }

  const hovered = hover !== null ? history[hover] : null
  const rows = hover !== null ? series.map((s) => ({ ...s, value: s.values[hover] })).sort((a, b) => b.value - a.value) : []

  return (
    <div className="relative">
      <svg
        ref={svg}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto"
        role="img"
        aria-label="Évolution dans le temps"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={y(top * f)} y2={y(top * f)} stroke="#464743" strokeWidth={1} />
            <text x={MARGIN.left - 8} y={y(top * f) + 4} textAnchor="end" fontSize={12} fill="#bcbbb3">
              {format(top * f)}
            </text>
          </g>
        ))}
        {[0, 0.5, 1].map((f) => (
          <text
            key={f}
            x={x(firstTick + span * f)}
            y={HEIGHT - 8}
            textAnchor={f === 0 ? 'start' : f === 1 ? 'end' : 'middle'}
            fontSize={12}
            fill="#bcbbb3"
          >
            Tick {Math.round(firstTick + span * f).toLocaleString()}
          </text>
        ))}
        {series.map((s) => (
          <polyline
            key={s.name}
            fill="none"
            stroke={s.color}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            points={s.values.map((v, i) => `${x(history[i].tick).toFixed(1)},${y(v).toFixed(1)}`).join(' ')}
          />
        ))}
        {hovered && (
          <>
            <line x1={x(hovered.tick)} x2={x(hovered.tick)} y1={MARGIN.top} y2={MARGIN.top + plotH} stroke="#98978f" strokeWidth={1} />
            {rows.map((r) => (
              <circle key={r.name} cx={x(hovered.tick)} cy={y(r.value)} r={4} fill={r.color} stroke="#2a2b29" strokeWidth={2} />
            ))}
          </>
        )}
      </svg>

      {hovered && (
        <div
          className="absolute top-2 game-panel px-2 py-1 text-xs pointer-events-none z-10"
          style={x(hovered.tick) > WIDTH / 2 ? { left: 72 } : { right: 16 }}
        >
          <div className="font-semibold mb-0.5">Tick {hovered.tick.toLocaleString()}</div>
          {rows.map((r) => (
            <div key={r.name} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1 italic">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: r.color }} />
                {r.name}
              </span>
              <span className="tabular-nums font-semibold not-italic">{format(r.value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** Onglet Graphiques : l'histoire de la partie, sans dépendre de la base de données. */
export function GraphsPage() {
  const { history } = useGameLog()
  const [metric, setMetric] = useState<Metric>('bySpecies')
  const [source, setSource] = useState<'session' | 'database'>('session')
  // Une espèce garde sa couleur même si elle change de rang.
  const colorOf = useRef(new Map<string, string>())

  const definition = METRICS.find((m) => m.id === metric) ?? METRICS[0]

  const series = useMemo<Series[]>(() => {
    if (history.length === 0) return []
    if (metric !== 'bySpecies') {
      return [{ name: definition.label, color: SERIES_COLORS[0], values: history.map((h) => h[metric]) }]
    }

    const latest = history[history.length - 1].bySpecies
    const named = Object.keys(latest).sort((a, b) => latest[b] - latest[a]).slice(0, MAX_NAMED_SPECIES)
    const inUse = new Set(named.map((n) => colorOf.current.get(n)).filter(Boolean))
    for (const name of named) {
      if (colorOf.current.has(name)) continue
      const free = SERIES_COLORS.find((c) => !inUse.has(c)) ?? SERIES_COLORS[0]
      colorOf.current.set(name, free)
      inUse.add(free)
    }

    const result: Series[] = named.map((name) => ({
      name,
      color: colorOf.current.get(name) ?? SERIES_COLORS[0],
      values: history.map((h) => h.bySpecies[name] ?? 0)
    }))
    const others = history.map((h) => {
      const shown = named.reduce((sum, name) => sum + (h.bySpecies[name] ?? 0), 0)
      return Math.max(0, h.population - shown)
    })
    if (others.some((v) => v > 0)) result.push({ name: 'Autres espèces', color: OTHERS_COLOR, values: others })
    return result
  }, [history, metric, definition.label])

  return (
    <>
      <div className="flex flex-wrap items-center gap-0.5">
        {METRICS.map((m) => (
          <button
            key={m.id}
            className={`game-button px-2 py-0.5 text-xs ${source === 'session' && metric === m.id ? 'game-button-active' : ''}`}
            onClick={() => {
              setSource('session')
              setMetric(m.id)
            }}
          >
            {m.label}
          </button>
        ))}
        <button
          className={`game-button px-2 py-0.5 text-xs ml-2 ${source === 'database' ? 'game-button-active' : ''}`}
          title="Historique enregistré dans PostgreSQL, s'il est connecté"
          onClick={() => setSource('database')}
        >
          Base de données
        </button>
      </div>

      {source === 'database' ? (
        <HistoryView />
      ) : history.length < 2 ? (
        <p className="text-xs text-slate-400 p-2">La courbe apparaîtra après quelques ticks.</p>
      ) : (
        <>
          {series.length > 1 && (
            <ul className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs" aria-label="Légende">
              {series.map((s) => (
                <li key={s.name} className="flex items-center gap-1 italic">
                  <span className="w-2.5 h-0.5 inline-block" style={{ background: s.color }} />
                  {s.name}
                </li>
              ))}
            </ul>
          )}
          <LiveChart history={history} series={series} format={definition.format} />
        </>
      )}
    </>
  )
}
