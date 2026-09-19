import { SpeciationEventInfo } from '../types'

/** Hash simple et déterministe d'une chaîne -- même nom, même valeur,
 * toujours, sur n'importe quelle machine (contrairement à un Map.get(index)
 * qui dépend de l'ordre d'un tableau qui change à chaque spéciation). */
function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

/**
 * Une teinte (degrés HSL, 0-360) stable par espèce, dérivée de la vraie
 * topologie de lignées (speciationEvents) -- pas de l'index de l'espèce
 * dans le tableau `lineages`, qui change d'ordre dès qu'une spéciation
 * survient (bug corrigé ici : voir CONTRIBUTING.md). Une lignée fondatrice
 * (jamais `newSpecies` dans l'historique) reçoit une teinte fixée par hash
 * de son nom ; une lignée issue d'une scission hérite de la teinte de son
 * parent puis dérive d'un angle proportionnel à la distance génétique
 * réellement mesurée à la scission (`geneticDistanceAtSplit`) -- une
 * scission franche s'éloigne visuellement plus qu'une scission de justesse,
 * pour qu'on puisse suivre une divergence des yeux plutôt que de voir une
 * palette sauter au hasard.
 */
export function computeLineageHues(events: SpeciationEventInfo[], allSpeciesNames: string[]): Map<string, number> {
  const hueOf = new Map<string, number>()
  const childrenOf = new Map<string, SpeciationEventInfo[]>()
  const hasParent = new Set<string>()

  events.forEach((event) => {
    if (!childrenOf.has(event.parentSpecies)) childrenOf.set(event.parentSpecies, [])
    childrenOf.get(event.parentSpecies)!.push(event)
    hasParent.add(event.newSpecies)
  })

  const assign = (name: string, hue: number) => {
    if (hueOf.has(name)) return // deja assignee via un autre chemin (securite anti-boucle)
    hueOf.set(name, hue)
    for (const event of childrenOf.get(name) ?? []) {
      const drift = 25 + Math.min(1, event.geneticDistanceAtSplit) * 120
      const direction = hashString(event.newSpecies) % 2 === 0 ? 1 : -1
      assign(event.newSpecies, (hue + direction * drift + 360) % 360)
    }
  }

  const parentNames = new Set(events.map((e) => e.parentSpecies))
  const rootCandidates = new Set<string>([...allSpeciesNames.filter((n) => !hasParent.has(n)), ...Array.from(parentNames).filter((n) => !hasParent.has(n))])

  for (const root of rootCandidates) {
    assign(root, hashString(root) % 360)
  }

  // Filet de sécurité : toute espèce vivante jamais atteinte par la
  // récursion (topologie inattendue) reçoit quand même une teinte stable.
  for (const name of allSpeciesNames) {
    if (!hueOf.has(name)) hueOf.set(name, hashString(name) % 360)
  }

  return hueOf
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  const bigint = parseInt(clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean, 16)
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255]
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0, g = 0, b = 0
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)]
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')
}

/**
 * Couleur réelle d'un individu : sa teinte de lignée mélangée vers la vraie
 * couleur du biome où il se trouve, dans la proportion de son trait
 * CAMOUFLAGE réel -- le camouflage est rendu comme un mélange de couleur
 * littéral avec l'arrière-plan, une métaphore honnête et directement
 * lisible plutôt qu'un chiffre abstrait.
 */
export function creatureColor(hueDegrees: number, camouflage: number, biomeColorHex: string): string {
  const base = hslToRgb(hueDegrees, 0.65, 0.5)
  const biome = hexToRgb(biomeColorHex)
  const blend = Math.max(0, Math.min(1, camouflage)) * 0.6 // jamais un camouflage parfait a 100% invisible
  const mixed: [number, number, number] = [
    base[0] * (1 - blend) + biome[0] * blend,
    base[1] * (1 - blend) + biome[1] * blend,
    base[2] * (1 - blend) + biome[2] * blend
  ]
  return rgbToHex(mixed)
}
