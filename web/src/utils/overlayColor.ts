import { hexToRgb, rgbToHex } from './lineageColor'

/**
 * Couleurs d'overlay de carte (Chantier E2) : chaque métrique réelle par
 * région (RegionInfo) peut remplacer l'affichage biome par une rampe
 * séquentielle une-seule-teinte, claire -> foncée, calculée à partir du
 * vrai min/max observé dans les données actuelles -- jamais des bornes
 * arbitraires codées en dur (un monde différent, une échelle différente).
 */
export type OverlayMode = 'biome' | 'temperature' | 'fertility' | 'predation' | 'competition' | 'climaticStress'

export const OVERLAY_LABELS: Record<OverlayMode, string> = {
  biome: 'Biomes',
  temperature: 'Température',
  fertility: 'Fertilité (producteurs primaires)',
  predation: 'Pression de prédation',
  competition: 'Intensité de compétition',
  climaticStress: 'Stress climatique'
}

const RAMPS: Record<Exclude<OverlayMode, 'biome'>, { light: string; dark: string }> = {
  temperature: { light: '#fef3c7', dark: '#7c2d12' },
  fertility: { light: '#f0fdf4', dark: '#14532d' },
  predation: { light: '#fef2f2', dark: '#7f1d1d' },
  competition: { light: '#faf5ff', dark: '#581c87' },
  climaticStress: { light: '#ecfeff', dark: '#164e63' }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function sequentialColor(value: number, min: number, max: number, mode: Exclude<OverlayMode, 'biome'>): string {
  const ramp = RAMPS[mode]
  const span = max - min
  const t = span > 1e-9 ? Math.min(1, Math.max(0, (value - min) / span)) : 0.5
  const light = hexToRgb(ramp.light)
  const dark = hexToRgb(ramp.dark)
  return rgbToHex([lerp(light[0], dark[0], t), lerp(light[1], dark[1], t), lerp(light[2], dark[2], t)])
}

export function ramp(mode: Exclude<OverlayMode, 'biome'>): { light: string; dark: string } {
  return RAMPS[mode]
}
