#!/usr/bin/env node
// Lancé par `npm run dev` : recompile serina_daemon si le code C++ est plus récent que
// l'exécutable. Sans ça, le jeu tourne sans prévenir avec un ancien moteur.
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const buildDir = path.join(root, 'build');
const binaries = ['bin/serina_daemon.exe', 'bin/serina_daemon', 'bin/Release/serina_daemon.exe'].map((p) => path.join(buildDir, p));

function newestSource(entry) {
  const stat = fs.statSync(entry);
  if (!stat.isDirectory()) return /\.(hpp|cpp|txt)$/.test(entry) ? stat.mtimeMs : 0;
  return Math.max(0, ...fs.readdirSync(entry).map((name) => newestSource(path.join(entry, name))));
}

function run(args) {
  return spawnSync('cmake', args, { cwd: root, stdio: 'inherit', shell: false });
}

const binary = binaries.find((p) => fs.existsSync(p));
const sources = Math.max(...['include', 'src', 'CMakeLists.txt'].map((p) => newestSource(path.join(root, p))));
if (binary && fs.statSync(binary).mtimeMs >= sources) process.exit(0);

console.log(binary ? 'Moteur périmé : recompilation de serina_daemon...' : 'Moteur absent : compilation de serina_daemon...');
const configure = fs.existsSync(path.join(buildDir, 'CMakeCache.txt')) ? { status: 0 } : run(['-S', '.', '-B', 'build', '-DBUILD_TESTS=OFF']);
const build = configure.status === 0 ? run(['--build', 'build', '--target', 'serina_daemon']) : configure;

if (build.error || build.status !== 0) {
  // Ne bloque pas le lancement : l'API refusera de démarrer une partie et dira pourquoi.
  console.warn('Compilation impossible. Si un ancien serina_daemon tourne encore, arrête-le puis relance.');
}
