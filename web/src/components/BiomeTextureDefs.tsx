/**
 * Texture de terrain façon RimWorld : chaque biome a un motif SVG répété
 * (touffes d'herbe, canopée, vaguelettes, roche, sable, glace...) dessiné
 * avec des formes natives simples, sans dépendance de rendu ni image
 * externe -- cohérent avec le choix technique de rester en SVG pur. Les
 * motifs sont en `userSpaceOnUse` (pas par cellule) pour que la texture
 * s'aligne parfaitement entre deux cases adjacentes du même biome, comme
 * une vraie plaine continue plutôt qu'un carrelage de tuiles visiblement
 * répétées. Identifiants de motifs : voir utils/mapTexture.ts's
 * BIOME_PATTERN_IDS.
 */
export function BiomeTextureDefs({ cellSize }: { cellSize: number }) {
  const s = cellSize / 3; // 3x3 répétitions de motif par case

  return (
    <defs>
      {/* Prairie : touffes d'herbe -- petits traits courts */}
      <pattern id="tex-grassland" width={s} height={s} patternUnits="userSpaceOnUse">
        <line x1={s * 0.2} y1={s * 0.8} x2={s * 0.15} y2={s * 0.55} stroke="#00000028" strokeWidth={s * 0.06} strokeLinecap="round" />
        <line x1={s * 0.7} y1={s * 0.75} x2={s * 0.68} y2={s * 0.5} stroke="#00000020" strokeWidth={s * 0.05} strokeLinecap="round" />
      </pattern>

      {/* Forêt : blobs de canopée */}
      <pattern id="tex-forest" width={s} height={s} patternUnits="userSpaceOnUse">
        <circle cx={s * 0.3} cy={s * 0.35} r={s * 0.22} fill="#00000030" />
        <circle cx={s * 0.75} cy={s * 0.65} r={s * 0.16} fill="#00000024" />
      </pattern>

      {/* Forêt tropicale : canopée plus dense et plus vive */}
      <pattern id="tex-tropical" width={s} height={s} patternUnits="userSpaceOnUse">
        <circle cx={s * 0.28} cy={s * 0.3} r={s * 0.26} fill="#00000030" />
        <circle cx={s * 0.72} cy={s * 0.6} r={s * 0.24} fill="#00000028" />
        <circle cx={s * 0.5} cy={s * 0.85} r={s * 0.14} fill="#ffffff18" />
      </pattern>

      {/* Eau douce : vaguelettes */}
      <pattern id="tex-water" width={s * 1.4} height={s} patternUnits="userSpaceOnUse">
        <path d={`M0,${s * 0.5} q${s * 0.35},${-s * 0.25} ${s * 0.7},0 q${s * 0.35},${s * 0.25} ${s * 0.7},0`} stroke="#ffffff35" strokeWidth={s * 0.05} fill="none" />
      </pattern>

      {/* Océan : vaguelettes plus marquées, plus sombres entre les crêtes */}
      <pattern id="tex-water-deep" width={s * 1.4} height={s} patternUnits="userSpaceOnUse">
        <path d={`M0,${s * 0.4} q${s * 0.35},${-s * 0.3} ${s * 0.7},0 q${s * 0.35},${s * 0.3} ${s * 0.7},0`} stroke="#ffffff2a" strokeWidth={s * 0.05} fill="none" />
        <path d={`M0,${s * 0.8} q${s * 0.35},${-s * 0.2} ${s * 0.7},0 q${s * 0.35},${s * 0.2} ${s * 0.7},0`} stroke="#00000020" strokeWidth={s * 0.04} fill="none" />
      </pattern>

      {/* Zones humides : roseaux -- traits fins en diagonale */}
      <pattern id="tex-wetland" width={s} height={s} patternUnits="userSpaceOnUse">
        <line x1={s * 0.3} y1={s} x2={s * 0.4} y2={s * 0.4} stroke="#00000028" strokeWidth={s * 0.045} strokeLinecap="round" />
        <line x1={s * 0.65} y1={s} x2={s * 0.72} y2={s * 0.5} stroke="#00000020" strokeWidth={s * 0.04} strokeLinecap="round" />
      </pattern>

      {/* Montagne : hachures rocheuses */}
      <pattern id="tex-mountain" width={s} height={s} patternUnits="userSpaceOnUse">
        <polyline points={`0,${s * 0.9} ${s * 0.3},${s * 0.35} ${s * 0.55},${s * 0.7} ${s},${s * 0.15}`} stroke="#00000035" strokeWidth={s * 0.05} fill="none" strokeLinejoin="round" />
      </pattern>

      {/* Désert : grains de sable épars */}
      <pattern id="tex-desert" width={s} height={s} patternUnits="userSpaceOnUse">
        <circle cx={s * 0.25} cy={s * 0.3} r={s * 0.05} fill="#00000022" />
        <circle cx={s * 0.7} cy={s * 0.6} r={s * 0.04} fill="#00000018" />
        <circle cx={s * 0.5} cy={s * 0.85} r={s * 0.045} fill="#00000020" />
      </pattern>

      {/* Arctique : cristaux de glace -- petites croix */}
      <pattern id="tex-arctic" width={s} height={s} patternUnits="userSpaceOnUse">
        <line x1={s * 0.5} y1={s * 0.3} x2={s * 0.5} y2={s * 0.55} stroke="#ffffff50" strokeWidth={s * 0.035} />
        <line x1={s * 0.38} y1={s * 0.42} x2={s * 0.62} y2={s * 0.42} stroke="#ffffff50" strokeWidth={s * 0.035} />
      </pattern>
    </defs>
  );
}
