#!/usr/bin/env node
// Bumps the-chords' @gblp/* deps to their latest published npm versions,
// installs, and verifies with a production build. Never commits or pushes —
// that step stays manual, same as the rest of this repo's workflow.
import { execFileSync } from 'node:child_process';

const run = (cmd, args) => execFileSync(cmd, args, { stdio: 'inherit', shell: true });
const runCapture = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8', shell: true });

let outdated;
try {
  outdated = JSON.parse(runCapture('npm', ['outdated', '--json']) || '{}');
} catch (err) {
  // npm outdated exits 1 when it finds anything outdated; stdout still has the JSON.
  outdated = JSON.parse(err.stdout || '{}');
}

const libs = Object.keys(outdated).filter((name) => name.startsWith('@gblp/'));

if (libs.length === 0) {
  console.log('Todas las @gblp/* libs ya están en su última versión publicada.');
  process.exit(0);
}

console.log(`Actualizando: ${libs.join(', ')}`);
for (const lib of libs) {
  const { current, latest } = outdated[lib];
  console.log(`  ${lib}: ${current} -> ${latest}`);
}

run('npm', ['install', ...libs.map((lib) => `${lib}@latest`)]);

console.log('\nVerificando con build de producción...');
try {
  run('npx', ['ng', 'build', '--configuration', 'production']);
} catch (err) {
  console.error('\nBuild falló. Revirtiendo package.json/package-lock.json.');
  run('git', ['checkout', '--', 'package.json', 'package-lock.json']);
  process.exit(1);
}

console.log('\nBuild OK. Cambios listos sin commitear:');
run('git', ['status', '--short', 'package.json', 'package-lock.json']);
console.log('\nRevisa y pide el commit+push cuando quieras (no se hace automático).');
