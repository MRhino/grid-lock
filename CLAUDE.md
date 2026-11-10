# Grid Lock

- Every push to `main` must bump the `version` in `package.json` (minor: 0.1.0 → 0.2.0). The start screen shows `v<major>.<minor> · <commit>`.
- Deploys, once Vercel is linked: confirm each push is Ready, the GitHub check is green, and the version string is in the live bundle.
- `src/puzzle.ts` is pure (no DOM). `npm test` re-solves every level; run it after any puzzle or level change and report the numbers.
- Difficulty is ONE scalar: target par by level (`parFor` in `scripts/gen-levels.ts`). Don't add separate knobs.
- `src/levels.json` is append-only once shipped: saved progress is keyed by level number. Never reorder or edit shipped levels.
- Consecutive slides of one vehicle merge into one move (`Game.play`). That keeps par fair: a vehicle's free range is contiguous, so a chain of its slides equals one direct slide.
- Never ship the same puzzle twice: two boards are the same puzzle when `puzzleKey` (reachable positions) matches, even if a car is parked elsewhere. Campaign levels 1-99 predate this and contain repeats; 100-150 were regenerated (v0.9) with `npm run levels -- <seconds> 46 --from 100` and are checked by `npm test`.
- Levels 1-150 are the Warm-Up pack; the campaign starts at `CAMPAIGN_START` (151). `npm run levels` regenerates only the campaign and is time-budgeted, so don't re-run it after the campaign ships; add new levels by appending.
- Levels are always generated. Never copy layouts from a commercial puzzle product, and keep its name and look out of the game.
- Player progress must survive every deploy (`src/progress.ts`): never rename the `gl-save-v1` key; change the shape only by bumping `SCHEMA` and adding a `MIGRATIONS` step. The mid-level run (`gl-run`) is disposable.
- Cloud save: `api/save.ts` stores one private Vercel Blob per save ID (`saves/<ID>.json`, store `grid-lock-saves`, syd1; previews use `preview/saves/`). `mergeSaves` in `src/saveid.ts` merges level by level and must cover every new save field. The client syncs on launch and after each clear, never per move. Reset takes a new ID so old clears aren't merged back.
- The service worker must never reload mid-level (`reloadPending` in main.ts).
- Visual check: `npm run build && npx vite preview`, then screenshot with headless Chrome. `?shot=LEVEL&solve=N` opens a level and plays N solution moves without saving.
- Visuals: the printed-tin toy world in `DESIGN.md`. Obvious and saturated, never glowing. Subtle cues get rejected.
