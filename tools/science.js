#!/usr/bin/env node
// Lance serina_bench sur plusieurs graines en parallèle et résume les indicateurs.
//
//   node tools/science.js --bin build/bin/serina_bench [--seeds 1-24] [--ticks 4000] [--jobs 6] [cle=valeur ...]
const { execFile } = require('child_process');

function parseArgs(argv) {
  const opts = { bin: 'build/bin/serina_bench', seeds: '1-24', ticks: 4000, jobs: 6, params: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) opts[a.slice(2)] = argv[++i];
    else opts.params.push(a);
  }
  return opts;
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[sorted.length >> 1];
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const [from, to] = opts.seeds.split('-').map(Number);
  const queue = [];
  for (let s = from; s <= (to ?? from); s++) queue.push(s);

  const rows = [];
  const total = queue.length;
  const started = Date.now();
  const worker = async () => {
    while (queue.length) {
      const seed = queue.shift();
      const out = await new Promise((resolve, reject) =>
        execFile(opts.bin, [seed, opts.ticks, ...opts.params], (err, stdout) => (err ? reject(err) : resolve(stdout)))
      );
      rows.push(JSON.parse(out));
      console.error(`  ${rows.length}/${total} graines (graine ${seed}, ${Math.round((Date.now() - started) / 1000)} s)`);
    }
  };
  await Promise.all(Array.from({ length: Number(opts.jobs) }, worker));

  const med = (k) => median(rows.map((r) => r[k]));
  const alive = (k) => rows.filter((r) => r[k] > 0).length;
  const n = rows.length;
  console.log(`[${opts.params.join(' ') || 'défaut'}] ${n} graines, ${opts.ticks} ticks`);
  console.log(
    `  pop ${med('pop')} (mondes <100: ${rows.filter((r) => r.pop < 100).length}) | espèces ${med('lineages')} | ` +
      `spéciations ${med('speciations')} | cases occupées ${med('occupied')}/108`
  );
  console.log(
    `  au mur ${med('wallPct')}% | en bordure ${med('borderPct')}% (35% des cases) | ` +
      `hors habitat ${med('forbiddenPct')}% | âge moyen ${med('meanAge')}`
  );
  console.log(
    `  dans chaque espèce : résistance/climat ${med('resistanceWithin')} | isolation/température ${med('insulationWithin')}\n` +
      `  niches des oiseaux ${med('birdGuilds')}/3 (max ${Math.max(...rows.map((r) => r.birdGuilds))}) | toutes espèces ${med('allGuilds')}/3 | écart de régime des oiseaux ${med('birdDietSpread')} | régime moyen ${med('meanDiet')} | plantes ${med('plantLevel')}\n` +
      `  voisinage entre espèces ${med('sympatry')} | étendue du régime des oiseaux (p10-p90) ${med('birdDietRange')}\n` +
      `  taille moyenne ${med('meanSize')} | proies tuées ${med('kills')}\n` +
      `  isolation : écart à l'idéal ${med('insulationGap')} | avantage local ${med('localAdvantage')} | étendue climatique ${med('climateSpread')}`
  );
  console.log(
    `  groupes vivants /${n} : oiseaux ${alive('bird')}, poissons ${alive('fish')}, ` +
      `arthropodes ${alive('arthropod')}, mollusques ${alive('mollusc')}`
  );
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
