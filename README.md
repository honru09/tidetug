# tidetug

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/honru09/tidetug/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/honru09/tidetug/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

TIDETUG is an original orbital salvage game that runs offline in a desktop browser from its own files: you pilot a tug drone around the planet Vesper, riding gravity and a tether drive to recover twelve salvage pods before your charge or your hull runs out, while shard mines hunt the same orbit and near misses pay graze bonuses. It is plain HTML and ES modules on a canvas — no library, no build step, no network — with a fixed-step seeded simulation, synthesised sound effects, and title, pause, win and wreck screens around a two-to-four minute run.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 and press ENTER to fly. Hold Space, ↑ or the pointer to climb outward; release and gravity pulls you back in.

For the bounty harness, `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts` copies `game/` and `screenshots/` into `out/` and writes `out/dossier.json`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=vjfcejxy&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
