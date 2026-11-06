import { useEffect, useRef, useState } from 'react'
import { apiService } from '@services/ApiService'
import { BIOME_NAMES, GlobeRenderer, PlanetData } from '../map/globeRenderer'

interface GlobeViewProps {
  simulationId: string | number | null
  season: number | undefined
  /** Descendre sur la carte actuelle, celle de la tuile marquée. */
  onOpenHome: () => void
}

/**
 * La planète façon RimWorld : des milliers de tuiles générées par le moteur. Seule la tuile
 * marquée a déjà sa carte : chaque tuile aura la sienne à l'étape 4 de docs/PLANET_DESIGN.md.
 */
export function GlobeView({ simulationId, season, onOpenHome }: GlobeViewProps) {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null)
  const renderer = useRef<GlobeRenderer | null>(null)
  const [planet, setPlanet] = useState<PlanetData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null)
  const readout = useRef<HTMLDivElement>(null)
  const marker = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!canvas) return
    let created: GlobeRenderer | null = null
    try {
      created = new GlobeRenderer(canvas, (e) => setError(e.message))
      renderer.current = created
      created.start().catch((e: Error) => setError(e.message))
      if (import.meta.env.DEV) (window as unknown as { __serinaGlobe?: GlobeRenderer }).__serinaGlobe = created
    } catch (e) {
      setError((e as Error).message)
    }
    return () => {
      created?.destroy()
      renderer.current = null
    }
  }, [canvas])

  // La planète ne change pas pendant la partie : une seule demande.
  useEffect(() => {
    if (!simulationId) return
    let cancelled = false
    apiService
      .getPlanet(simulationId)
      .then((data) => {
        if (cancelled) return
        setPlanet(data)
      })
      .catch((e: Error) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [simulationId])

  useEffect(() => {
    if (!planet) return
    renderer.current?.setPlanet(planet)
    renderer.current?.focusTile(planet.home)
  }, [planet, canvas])
  useEffect(() => {
    renderer.current?.setSelection(selected)
  }, [selected, canvas])
  useEffect(() => {
    if (season !== undefined) renderer.current?.setSeason(season)
  }, [season, canvas])

  // Le repère de la carte suit la tuile marquée, et disparaît quand elle passe de l'autre côté.
  useEffect(() => {
    let handle = 0
    const follow = () => {
      handle = requestAnimationFrame(follow)
      const el = marker.current
      if (!el || !planet) return
      const at = renderer.current?.project(planet.home)
      el.style.display = at ? 'block' : 'none'
      if (at) el.style.transform = `translate(${at.x}px, ${at.y}px) translate(-50%, -140%)`
    }
    handle = requestAnimationFrame(follow)
    return () => cancelAnimationFrame(handle)
  }, [planet])

  useEffect(() => {
    if (!canvas) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      renderer.current?.zoomBy(e.deltaY > 0 ? 1.12 : 1 / 1.12)
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [canvas])

  const describe = (tile: number) => {
    const t = planet?.tiles[tile]
    if (!t) return ''
    const water = t[3] === 2 || t[3] === 3
    const parts = [BIOME_NAMES[t[3]] ?? 'Inconnu', `${t[5].toFixed(0)} °C en moyenne`]
    if (!water) parts.push(`${t[6].toFixed(0)} mm de pluie par an`, `${(t[4] * 1000).toFixed(0)} m d'altitude`)
    else parts.push(`${(-t[4] * 1000).toFixed(0)} m de fond`)
    return parts.join(', ')
  }

  return (
    <div className="absolute inset-0 z-[4] bg-black">
      <canvas
        ref={setCanvas}
        data-globe
        className="absolute inset-0 w-full h-full block cursor-grab"
        onMouseDown={(e) => { drag.current = { x: e.clientX, y: e.clientY, moved: false } }}
        onMouseMove={(e) => {
          const d = drag.current
          if (d) {
            if (Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 2) d.moved = true
            renderer.current?.rotateBy(e.clientX - d.x, e.clientY - d.y)
            d.x = e.clientX
            d.y = e.clientY
          }
          const tile = renderer.current?.pickTile(e.clientX, e.clientY) ?? null
          renderer.current?.setHover(tile)
          if (readout.current) {
            readout.current.style.display = tile !== null ? 'block' : 'none'
            if (tile !== null) readout.current.textContent = describe(tile)
          }
        }}
        onMouseUp={(e) => {
          const d = drag.current
          drag.current = null
          if (d && !d.moved) {
            const tile = renderer.current?.pickTile(e.clientX, e.clientY) ?? null
            setSelected(tile)
            setNotice(null)
          }
        }}
        onMouseLeave={() => {
          drag.current = null
          renderer.current?.setHover(null)
          if (readout.current) readout.current.style.display = 'none'
        }}
        onDoubleClick={(e) => {
          const tile = renderer.current?.pickTile(e.clientX, e.clientY)
          if (tile === undefined || tile === null || !planet) return
          if (tile === planet.home) onOpenHome()
          else setNotice("Cette tuile n'a pas encore sa propre carte. Chaque tuile aura la sienne à l'étape 4 du plan.")
        }}
      />
      <div
        ref={marker}
        className="absolute left-0 top-0 pointer-events-none game-panel px-1.5 py-0.5 text-[11px] text-amber-200 whitespace-nowrap"
        style={{ display: 'none' }}
      >
        Votre carte
      </div>
      <div
        ref={readout}
        className="absolute bottom-11 left-1/2 -translate-x-1/2 game-panel text-slate-300 px-2 py-0.5 text-[11px] pointer-events-none"
        style={{ display: 'none' }}
      />
      <div className="absolute top-14 left-1/2 -translate-x-1/2 game-panel px-3 py-1 text-xs text-slate-300 pointer-events-none text-center">
        {planet ? `Planète : ${planet.tiles.length} tuiles. ` : 'Chargement de la planète... '}
        Glisser pour tourner, double-clic sur la tuile marquée pour descendre sur votre carte (P pour revenir)
      </div>
      {selected !== null && planet && (
        <div className="absolute left-2 bottom-11 game-panel w-72 p-2 text-xs space-y-1">
          <div className="font-semibold text-sm">{BIOME_NAMES[planet.tiles[selected][3]] ?? 'Tuile'}</div>
          <div className="text-slate-300">{describe(selected)}</div>
          {selected === planet.home ? (
            <button className="game-button w-full py-1" onClick={onOpenHome}>Descendre sur votre carte</button>
          ) : (
            <div className="text-slate-400">Pas encore de carte pour cette tuile.</div>
          )}
        </div>
      )}
      {notice && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 game-panel px-3 py-1 text-xs text-amber-200">{notice}</div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="game-panel p-4 text-sm max-w-md">
            <p className="font-semibold text-red-300">Impossible d'afficher la planète</p>
            <p className="text-xs text-slate-400 mt-1">{error}</p>
          </div>
        </div>
      )}
    </div>
  )
}
