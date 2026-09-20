import { useEffect, useMemo, useState } from 'react'
import { useSimulation } from '@services/SimulationContext'
import { apiService } from '@services/ApiService'
import { EvolutionHistoryEntry } from '../types'

const REFRESH_MS = 5000

// Palette validée (node scripts/validate_palette.js) pour la surface sombre
// réelle de l'app (#0f172a) -- les teintes 400 déjà utilisées ailleurs dans
// l'UI (primary-400, genetic-400) sont trop claires pour la bande de
// luminosité OKLCH attendue en mode sombre ; ces teintes 600 sont les mêmes
// familles de couleur, recalées pour rester lisibles ET distinguables en
// daltonisme. Le couple sky/genetic reste dans la bande "6-8" de séparation
// CVD (pas la cible 8+) : chaque ligne porte donc une étiquette directe en
// bout de courbe (encodage secondaire), pas seulement la couleur.
const COLOR_POPULATION = '#0284c7'
const COLOR_SPECIES = '#16a34a'
const COLOR_FITNESS = '#0284c7'
const COLOR_DIVERSITY = '#9333ea'
const SURFACE = '#0f172a'
const GRID_COLOR = '#334155'

interface Point {
  x: number
  y: number
  generation: number
  value: number
}

interface Series {
  key: string
  label: string
  color: string
  points: Point[]
}

const CHART_W = 640
const CHART_H = 160
const PAD_L = 36
const PAD_R = 34 // laisse la place à l'étiquette de valeur en bout de courbe (sinon coupée par le bord du viewBox)
const PAD_T = 10
const PAD_B = 20

function buildSeries(
  rows: EvolutionHistoryEntry[],
  pick: (r: EvolutionHistoryEntry) => number,
  minGen: number,
  maxGen: number,
  minVal: number,
  maxVal: number
): Point[] {
  const genSpan = Math.max(1, maxGen - minGen)
  const valSpan = Math.max(1e-6, maxVal - minVal)
  return rows.map((r) => {
    const value = pick(r)
    const x = PAD_L + ((r.generation - minGen) / genSpan) * (CHART_W - PAD_L - PAD_R)
    const y = PAD_T + (1 - (value - minVal) / valSpan) * (CHART_H - PAD_T - PAD_B)
    return { x, y, generation: r.generation, value }
  })
}

/** Graphique de tendance réel (une ou deux séries), sans dépendance de
 * charting -- même convention SVG à la main que le reste du projet.
 * Survol : réticule vertical qui s'accroche au point le plus proche +
 * infobulle listant chaque série à ce point (voir skill dataviz). */
function TrendChart({ title, unit, series }: { title: string; unit?: string; series: Series[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const allPoints = series[0]?.points ?? []
  if (allPoints.length === 0) return null

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const relX = ((e.clientX - rect.left) / rect.width) * CHART_W
    let nearest = 0
    let nearestDist = Infinity
    allPoints.forEach((p, i) => {
      const d = Math.abs(p.x - relX)
      if (d < nearestDist) {
        nearestDist = d
        nearest = i
      }
    })
    setHoverIdx(nearest)
  }

  const yTicks = 4
  const values = series.flatMap((s) => s.points.map((p) => p.value))
  const minVal = Math.min(...values)
  const maxVal = Math.max(...values)

  return (
    <div className="bg-slate-800/40 border border-slate-700 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-slate-200">{title}</h4>
        {series.length > 1 && (
          <div className="flex items-center gap-3 text-xs text-slate-400">
            {series.map((s) => (
              <span key={s.key} className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-0.5 rounded" style={{ background: s.color }} />
                {s.label}
              </span>
            ))}
          </div>
        )}
      </div>

      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        className="w-full"
        style={{ height: 'auto' }}
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {Array.from({ length: yTicks + 1 }).map((_, i) => {
          const y = PAD_T + (i / yTicks) * (CHART_H - PAD_T - PAD_B)
          const value = maxVal - (i / yTicks) * (maxVal - minVal)
          return (
            <g key={i}>
              <line x1={PAD_L} y1={y} x2={CHART_W - PAD_R} y2={y} stroke={GRID_COLOR} strokeWidth={1} />
              <text x={PAD_L - 4} y={y + 3} textAnchor="end" fontSize={9} fill="#64748b">
                {value.toFixed(value < 5 ? 2 : 0)}
              </text>
            </g>
          )
        })}

        {series.map((s) => (
          <g key={s.key}>
            <path
              d={s.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Point de fin, avec anneau couleur de surface pour rester lisible sur la ligne */}
            <circle cx={s.points[s.points.length - 1].x} cy={s.points[s.points.length - 1].y} r={5} fill={s.color} stroke={SURFACE} strokeWidth={2} />
            <text
              x={s.points[s.points.length - 1].x + 6}
              y={s.points[s.points.length - 1].y + 3}
              fontSize={10}
              fill="#cbd5e1"
            >
              {s.points[s.points.length - 1].value.toFixed(s.points[s.points.length - 1].value < 5 ? 2 : 0)}{unit ?? ''}
            </text>
          </g>
        ))}

        {hoverIdx !== null && allPoints[hoverIdx] && (
          <g>
            <line x1={allPoints[hoverIdx].x} y1={PAD_T} x2={allPoints[hoverIdx].x} y2={CHART_H - PAD_B} stroke="#94a3b8" strokeWidth={1} strokeDasharray="2,2" />
            {series.map((s) => (
              <circle key={s.key} cx={s.points[hoverIdx]?.x} cy={s.points[hoverIdx]?.y} r={4} fill={s.color} stroke={SURFACE} strokeWidth={2} />
            ))}
          </g>
        )}
      </svg>

      {hoverIdx !== null && allPoints[hoverIdx] && (
        <div className="mt-1 text-xs text-slate-400 flex items-center gap-3">
          <span className="text-slate-300 font-medium">Génération {allPoints[hoverIdx].generation}</span>
          {series.map((s) => (
            <span key={s.key} className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-0.5 rounded" style={{ background: s.color }} />
              {s.points[hoverIdx]?.value.toFixed(s.points[hoverIdx].value < 5 ? 2 : 0)}{unit ?? ''}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Onglet "Historique" (Chantier E6) : ressuscite un vrai historique déjà
 * écrit en base à chaque sondage (voir simulationEngine.js#persistSnapshot)
 * mais jamais affiché jusqu'ici. N'affiche que les champs réellement
 * calculés (generation/population_count/species_count/average_fitness/
 * genetic_diversity) -- mutationsCount/reproductionsCount/extinctionRisk
 * sont des stubs codés en dur côté backend et ne sont jamais montrés ici
 * comme des données réelles (voir le plan Chantier E).
 */
export function HistoryView() {
  const { currentSimulationId } = useSimulation()
  const [rows, setRows] = useState<EvolutionHistoryEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!currentSimulationId) return
    let cancelled = false

    const fetchTrends = async () => {
      try {
        const res = await apiService.getPopulationTrends(currentSimulationId, 200)
        if (cancelled) return
        if (!res.success) {
          setError(res.error || 'Historique indisponible')
          return
        }
        // L'API renvoie du plus récent au plus ancien ; on retrace dans l'ordre chronologique.
        setRows([...(res.data ?? [])].reverse())
        setError(null)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      }
    }

    fetchTrends()
    const interval = setInterval(fetchTrends, REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [currentSimulationId])

  const { populationSeries, speciesSeries, fitnessDiversitySeries } = useMemo(() => {
    if (!rows || rows.length === 0) return { populationSeries: [], speciesSeries: [], fitnessDiversitySeries: [] }
    const gens = rows.map((r) => r.generation)
    const minGen = Math.min(...gens)
    const maxGen = Math.max(...gens)

    const pops = rows.map((r) => r.population_count)
    const populationPts = buildSeries(rows, (r) => r.population_count, minGen, maxGen, Math.min(...pops), Math.max(...pops))

    const species = rows.map((r) => r.species_count)
    const speciesPts = buildSeries(rows, (r) => r.species_count, minGen, maxGen, Math.min(...species), Math.max(...species))

    const fitDiv = [...rows.map((r) => r.average_fitness), ...rows.map((r) => r.genetic_diversity)]
    const fMin = Math.min(...fitDiv, 0)
    const fMax = Math.max(...fitDiv, 1)
    const fitnessPts = buildSeries(rows, (r) => r.average_fitness, minGen, maxGen, fMin, fMax)
    const diversityPts = buildSeries(rows, (r) => r.genetic_diversity, minGen, maxGen, fMin, fMax)

    return {
      populationSeries: [{ key: 'population', label: 'Population', color: COLOR_POPULATION, points: populationPts }],
      speciesSeries: [{ key: 'species', label: 'Espèces', color: COLOR_SPECIES, points: speciesPts }],
      fitnessDiversitySeries: [
        { key: 'fitness', label: 'Fitness moyenne', color: COLOR_FITNESS, points: fitnessPts },
        { key: 'diversity', label: 'Diversité génétique', color: COLOR_DIVERSITY, points: diversityPts }
      ]
    }
  }, [rows])

  if (!currentSimulationId) {
    return (
      <div className="card">
        <p className="text-sm text-slate-500">Aucune simulation active.</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card">
        <div className="border-b border-slate-700 pb-4 mb-4">
          <h3 className="text-lg font-semibold text-slate-100">Historique</h3>
        </div>
        <div className="bg-amber-950 border border-amber-800 rounded-md p-3 text-sm text-amber-300">
          Historique indisponible : {error}. L'historique persistant nécessite une base de données MySQL
          connectée (voir README) — les autres onglets, eux, restent en direct via le moteur.
        </div>
      </div>
    )
  }

  if (!rows) {
    return (
      <div className="card">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-slate-700 rounded w-1/4" />
          <div className="h-40 bg-slate-700 rounded" />
        </div>
      </div>
    )
  }

  if (rows.length < 2) {
    return (
      <div className="card">
        <div className="border-b border-slate-700 pb-4 mb-4">
          <h3 className="text-lg font-semibold text-slate-100">Historique</h3>
        </div>
        <p className="text-sm text-slate-500">Pas encore assez de générations enregistrées pour tracer une tendance.</p>
      </div>
    )
  }

  return (
    <div className="card space-y-4">
      <div className="border-b border-slate-700 pb-4">
        <h3 className="text-lg font-semibold text-slate-100">Historique</h3>
        <p className="text-sm text-slate-400">Tendances réelles enregistrées en base à chaque sondage, {rows.length} points</p>
      </div>

      <TrendChart title="Population totale" series={populationSeries} />
      <TrendChart title="Nombre d'espèces" series={speciesSeries} />
      <TrendChart title="Fitness moyenne et diversité génétique" series={fitnessDiversitySeries} />
    </div>
  )
}
