# Grid Lock

- Every push to `main` must bump the `version` in `package.json` (minor: 0.1.0 → 0.2.0). The start screen shows `v<major>.<minor> · <commit>`.
- Deploys, once Vercel is linked: confirm each push is Ready, the GitHub check is green, and the version string is in the live bundle.
- `src/puzzle.ts` is pure (no DOM). `npm test` re-solves every level; run it after any puzzle or level change and report the numbers.
- Difficulty is ONE scalar: target par by level (`parFor` in `scripts/gen-levels.ts`). Don't add separate knobs.
- `src/levels.json` is append-only once shipped: saved progress is keyed by level number. Never reorder or edit shipped levels.
- Consecutive slides of one vehicle merge into one move (`Game.play`). That keeps par fair: a vehicle's free range is contiguous, so a chain of its slides equals one direct slide.
- `npm run levels` is time-budgeted and can produce a different pack; don't re-run it after shipping.
- Levels are always generated. Never copy layouts from a commercial puzzle product, and keep its name and look out of the game.
- Player progress must survive every deploy (`src/progress.ts`): never rename the `gl-save-v1` key; change the shape only by bumping `SCHEMA` and adding a `MIGRATIONS` step. The mid-level run (`gl-run`) is disposable.
- The service worker must never reload mid-level (`reloadPending` in main.ts).
- Visual check: `npm run build && npx vite preview`, then screenshot with headless Chrome. `?shot=LEVEL&solve=N` opens a level and plays N solution moves without saving.
- Visuals: obvious, saturated, glowing. Subtle cues get rejected.
