import { useEffect, useRef } from 'react'
import { ATLAS_COLUMNS, buildCreatureAtlas, CELL_PX, creatureFrame, furFrame, hasFur } from '../map/creatureAtlas'

let atlas: HTMLCanvasElement | null = null

interface CreaturePortraitProps {
  biologicalType: number
  ornamentTier: number
  patternTier: number
  insulation?: number
  color: string
  size: number
}

/** Portrait d'une créature : le même dessin que sur la carte. */
export function CreaturePortrait({ biologicalType, ornamentTier, patternTier, insulation = 0, color, size }: CreaturePortraitProps) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    atlas ??= buildCreatureAtlas()

    const frame = creatureFrame(biologicalType, ornamentTier, patternTier)
    const sx = (frame % ATLAS_COLUMNS) * CELL_PX
    const sy = Math.floor(frame / ATLAS_COLUMNS) * CELL_PX
    const fur = furFrame(biologicalType)
    const furAlpha = hasFur(biologicalType) ? Math.min(1, Math.max(0, (insulation - 0.1) / 0.6)) : 0

    // La silhouette complète sert aussi de masque : la dessiner à part évite que le
    // masque des poils n'efface le corps.
    const silhouette = document.createElement('canvas')
    silhouette.width = canvas.width
    silhouette.height = canvas.height
    const shape = silhouette.getContext('2d')
    if (!shape) return
    if (furAlpha > 0) {
      shape.globalAlpha = furAlpha
      shape.drawImage(atlas, (fur % ATLAS_COLUMNS) * CELL_PX, Math.floor(fur / ATLAS_COLUMNS) * CELL_PX, CELL_PX, CELL_PX, 0, 0, canvas.width, canvas.height)
      shape.globalAlpha = 1
    }
    shape.drawImage(atlas, sx, sy, CELL_PX, CELL_PX, 0, 0, canvas.width, canvas.height)

    ctx.globalCompositeOperation = 'source-over'
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(silhouette, 0, 0)
    ctx.globalCompositeOperation = 'multiply'
    ctx.fillStyle = color
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    // La teinte a rempli toute la toile : on ne garde que la silhouette.
    ctx.globalCompositeOperation = 'destination-in'
    ctx.drawImage(silhouette, 0, 0)
  }, [biologicalType, ornamentTier, patternTier, insulation, color, size])

  const pixels = size * Math.min(window.devicePixelRatio || 1, 2)
  return <canvas ref={ref} width={pixels} height={pixels} style={{ width: size, height: size }} aria-hidden="true" />
}
