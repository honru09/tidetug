// TIDETUG's entrypoint for make.fun's best-game-01 (Node 22, standard library only).
//
// The game itself is the static bundle under game/ — plain files a desktop browser runs
// offline, no build step and no network. This program is the courier: it copies game/ and
// screenshots/ into the output directory and writes dossier.json, the summary the bounty
// judges from, using the vendored make.fun dossier library. It writes the same bytes every
// run, as the harness runs it twice and compares.
//
// In the grader's container the output is /output; anywhere else, point
// MAKEFUN_OUTPUT_DIR at a folder first:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The caps are the gate's own (the scorer refuses anything past them): at most 4
// screenshots of at most 256 KiB each, at most 993 game files and 48 MiB of game in all,
// no game path over 1,000 bytes, and the dossier's source text capped at 160 KiB.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
