import { hexToRgb, rgbToHex } from './lineageColor';

/** Nom exact de biome (voir EnvironmentalAdaptation.hpp) -> identifiant de
 * motif de texture (voir BiomeTextureDefs.tsx). */
export const BIOME_PATTERN_IDS: Record<string, string> = {
  'Prairie de Serina': 'tex-grassland',
  'Forêts de Serina': 'tex-forest',
  'Lacs et rivières': 'tex-water',
  'Océans de Serina': 'tex-water-deep',
  'Marécages et zones humides': 'tex-wetland',
  'Chaînes montagneuses': 'tex-mountain',
  'Déserts de Serina': 'tex-desert',
  'Régions arctiques de Serina': 'tex-arctic',
  'Forêts tropicales de Serina': 'tex-tropical'
};

/** Hash entier déterministe, simple et rapide -- même case, même valeur,
 * toujours (pas de Math.random : la texture ne doit pas scintiller d'un
 * rendu à l'autre). */
function hashCell(gx: number, gy: number): number {
  let h = (gx | 0) * 374761393 + (gy | 0) * 668265263;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return ((h >>> 0) % 10000) / 10000;
}

/** Fait varier légèrement la couleur d'une case (luminosité, ±amount) selon
 * ses coordonnées réelles -- une vraie plaine n'est jamais une seule
 * couleur plate ; cette variation est petite et déterministe, jamais
 * assez pour changer la lecture du biome. */
export function jitterColor(hex: string, gx: number, gy: number, amount = 12): string {
  const t = hashCell(gx, gy);
  const delta = Math.round((t - 0.5) * 2 * amount);
  const [r, g, b] = hexToRgb(hex);
  const clamp = (v: number) => Math.max(0, Math.min(255, v + delta));
  return rgbToHex([clamp(r), clamp(g), clamp(b)]);
}
