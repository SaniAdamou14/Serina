import type { MouseEvent as ReactMouseEvent } from 'react'
import { IndividualInfo } from '../types'

/**
 * Silhouettes procédurales réelles : chaque individu affiché sur la carte
 * l'est via une combinaison de formes SVG natives (ellipses, polygones,
 * lignes) paramétrée par une projection réelle de son génome (voir
 * IndividualSnapshot dans WorldSimulation.hpp) -- pas un art généré par IA,
 * pas un choix arbitraire : chaque canal visuel a une justification
 * biologique documentée dans docs/UNIFIED_ENGINE_DESIGN.md.
 *
 * Limite assumée : biologicalType ne change jamais à la spéciation (voir
 * performSpeciation() côté C++), donc la "famille" de silhouette reste
 * fixe pour toute une lignée -- ce qui varie visuellement entre lignées
 * apparentées, c'est l'échelle, les proportions, la couleur et
 * l'ornementation, jamais le gabarit de base.
 */

interface GlyphProps {
  fill: string
  ornamentTier: number
  sensoryProminence: number
  patternTier: number
}

function patternLines(count: number, color: string) {
  return Array.from({ length: count }).map((_, i) => (
    <line
      key={i}
      x1={-0.28 + i * 0.14}
      y1={-0.22}
      x2={-0.28 + i * 0.14}
      y2={0.22}
      stroke={color}
      strokeWidth={0.02}
      strokeOpacity={0.5}
    />
  ))
}

function BirdGlyph({ fill, ornamentTier, sensoryProminence, patternTier }: GlyphProps) {
  return (
    <g>
      <polygon points="-0.45,-0.08 -0.85,0 -0.45,0.08" fill={fill} opacity={0.85} />
      <ellipse cx={0} cy={0} rx={0.5} ry={0.32} fill={fill} />
      {patternLines(patternTier, '#000000')}
      <polygon points="0.45,-0.07 0.78,0 0.45,0.07" fill="#e8b23d" />
      <circle cx={0.24} cy={-0.08} r={0.045 + sensoryProminence * 0.06} fill="#111318" />
      {Array.from({ length: ornamentTier }).map((_, i) => (
        <polygon
          key={i}
          points={`${-0.12 + i * 0.1},-0.3 ${-0.07 + i * 0.1},-0.52 ${-0.02 + i * 0.1},-0.3`}
          fill={fill}
        />
      ))}
    </g>
  )
}

function FishGlyph({ fill, ornamentTier, sensoryProminence, patternTier }: GlyphProps) {
  return (
    <g>
      <polygon points="-0.5,0 -0.85,-0.25 -0.85,0.25" fill={fill} opacity={0.85} />
      <ellipse cx={0.1} cy={0} rx={0.55} ry={0.28} fill={fill} />
      {patternLines(patternTier, '#000000')}
      <circle cx={0.5} cy={-0.05} r={0.04 + sensoryProminence * 0.05} fill="#111318" />
      {Array.from({ length: ornamentTier }).map((_, i) => (
        <polygon
          key={i}
          points={`${0.1 + i * 0.12},-0.28 ${0.16 + i * 0.12},-0.48 ${0.22 + i * 0.12},-0.28`}
          fill={fill}
        />
      ))}
    </g>
  )
}

function ArthropodGlyph({ fill, ornamentTier, sensoryProminence, patternTier }: GlyphProps) {
  const legs = [-0.25, -0.05, 0.15]
  return (
    <g>
      {legs.map((lx, i) => (
        <g key={i}>
          <line x1={lx} y1={-0.15} x2={lx - 0.2} y2={-0.4} stroke={fill} strokeWidth={0.035} />
          <line x1={lx} y1={0.15} x2={lx - 0.2} y2={0.4} stroke={fill} strokeWidth={0.035} />
        </g>
      ))}
      <ellipse cx={-0.35} cy={0} rx={0.22} ry={0.18} fill={fill} />
      <ellipse cx={0.15} cy={0} rx={0.35} ry={0.24} fill={fill} />
      {patternLines(patternTier, '#000000')}
      <line
        x1={-0.5}
        y1={-0.05}
        x2={-0.7}
        y2={-0.2 - sensoryProminence * 0.15}
        stroke="#111318"
        strokeWidth={0.025}
      />
      <line
        x1={-0.5}
        y1={0.05}
        x2={-0.7}
        y2={0.2 + sensoryProminence * 0.15}
        stroke="#111318"
        strokeWidth={0.025}
      />
      {Array.from({ length: ornamentTier }).map((_, i) => (
        <polygon key={i} points={`${0.4 + i * 0.1},-0.1 ${0.55 + i * 0.1},0 ${0.4 + i * 0.1},0.1`} fill={fill} />
      ))}
    </g>
  )
}

function MolluscGlyph({ fill, ornamentTier, sensoryProminence, patternTier }: GlyphProps) {
  return (
    <g>
      <ellipse cx={-0.15} cy={0.15} rx={0.5} ry={0.2} fill={fill} opacity={0.6} />
      {Array.from({ length: 3 }).map((_, i) => (
        <circle key={i} cx={0.2 - i * 0.13} cy={-0.05 - i * 0.02} r={0.32 - i * 0.11} fill="none" stroke={fill} strokeWidth={0.05} />
      ))}
      <circle cx={0.28} cy={-0.08} r={0.16} fill={fill} />
      {patternLines(patternTier, '#000000')}
      <line
        x1={0.4}
        y1={-0.15}
        x2={0.55}
        y2={-0.3 - sensoryProminence * 0.15}
        stroke="#111318"
        strokeWidth={0.02}
      />
      {Array.from({ length: ornamentTier }).map((_, i) => (
        <circle key={i} cx={-0.3 - i * 0.08} cy={0.2} r={0.03} fill={fill} />
      ))}
    </g>
  )
}

const GLYPHS_BY_BIOLOGICAL_TYPE: Record<number, (props: GlyphProps) => JSX.Element> = {
  0: BirdGlyph, // BIRD
  1: FishGlyph, // FISH
  2: ArthropodGlyph, // ARTHROPOD
  3: MolluscGlyph // MOLLUSC
  // 4-7 (CNIDARIAN/ANNELID/PLANT/CRUSTACEAN) : aucun fondateur ni descendant
  // ne les utilise a ce jour -- repli sur ArthropodGlyph si jamais observe.
}

interface CreatureIconProps {
  individual: IndividualInfo
  color: string
  /** Rendu simplifié (point coloré taille réelle) à faible zoom -- le détail
   * des silhouettes est illisible sous quelques pixels, inutile de le payer. */
  detailed: boolean
  onClick?: (e: ReactMouseEvent<SVGElement>) => void
}

export function CreatureIcon({ individual, color, detailed, onClick }: CreatureIconProps) {
  const renderScale = 0.7 + individual.sizeScale * 1.1
  const elongationX = 1 + (individual.elongation - 0.5) * 0.5
  const elongationY = 1 - (individual.elongation - 0.5) * 0.3

  if (!detailed) {
    return (
      <circle
        cx={individual.x}
        cy={individual.y}
        r={Math.max(0.5, renderScale * 1.2)}
        fill={color}
        stroke="#00000099"
        strokeWidth={0.15}
        onClick={onClick}
        style={{ cursor: 'pointer' }}
      >
        <title>{`${individual.species} #${individual.id}`}</title>
      </circle>
    )
  }

  const Glyph = GLYPHS_BY_BIOLOGICAL_TYPE[individual.biologicalType] ?? ArthropodGlyph

  return (
    <g
      transform={`translate(${individual.x} ${individual.y}) scale(${renderScale * elongationX} ${renderScale * elongationY})`}
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      <title>{`${individual.species} #${individual.id}`}</title>
      <Glyph
        fill={color}
        ornamentTier={individual.ornamentTier}
        sensoryProminence={individual.sensoryProminence}
        patternTier={individual.patternTier}
      />
    </g>
  )
}
