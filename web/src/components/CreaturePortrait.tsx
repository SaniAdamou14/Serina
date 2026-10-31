import { useEffect, useRef } from 'react'
import { ATLAS_COLUMNS, buildCreatureAtlas, CELL_PX, creatureFrame } from '../map/creatureAtlas'

let atlas: HTMLCanvasElement | null = null

interface CreaturePortraitProps {
  biologicalType: number
  ornamentTier: number
  patternTier: number
  color: string
  size: number
}

/** Portrait d'une créature : le même dessin que sur la carte. */
export function CreaturePortrait({ biologicalType, ornamentTier, patternTier, color, size }: CreaturePortraitProps) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    atlas ??= buildCreatureAtlas()

    const frame = creatureFrame(biologicalType, ornamentTier, patternTier)
    const sx = (frame % ATLAS_COLUMNS) * CELL_PX
    const sy = Math.floor(frame / ATLAS_COLUMNS) * CELL_PX
    const draw = () => ctx.drawImage(atlas as HTMLCanvasElement, sx, sy, CELL_PX, CELL_PX, 0, 0, canvas.width, canvas.height)

    ctx.globalCompositeOperation = 'source-over'
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    draw()
    ctx.globalCompositeOperation = 'multiply'
    ctx.fillStyle = color
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    // La teinte a rempli toute la toile : on ne garde que la silhouette.
    ctx.globalCompositeOperation = 'destination-in'
    draw()
  }, [biologicalType, ornamentTier, patternTier, color, size])

  const pixels = size * Math.min(window.devicePixelRatio || 1, 2)
  return <canvas ref={ref} width={pixels} height={pixels} style={{ width: size, height: size }} aria-hidden="true" />
}
