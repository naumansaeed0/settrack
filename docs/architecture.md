# Architecture and maintenance

[← SetTrack](../README.md) · [Data guide](data-guide.md) · [Architecture](architecture.md) · [Deployment](deployment.md)

- `src/training.ts`: pure training rules, validation, canonical unit conversion, exercise types, finish checks, local-date filters, records, weekly summary and streak calculations.
- `src/useJournal.ts`: journal state, debounced writes, save queue, revision checking, recovery and import undo.
- `src/journal.ts`: IndexedDB **database version 2**, object stores `workspaces` and `safety`. The tested v1→v2 migration preserves journals/revisions and adds explicit exercise types.
- `src/backup.ts`, `src/csv.ts`, `src/sharing.ts`, `src/data.tsx`: backup validation/migration, spreadsheet format, platform sharing and user-facing data controls.
- `src/overview.tsx`, `src/workout.tsx`, `src/history.tsx`, `src/ui.tsx`: views and shared components. Navigation uses hashes so static-host deep links reload correctly.
- `src/theme.tsx`, `src/styles.css`: semantic design tokens and theme choice. Space Grotesk and IBM Plex Mono Latin WOFF2 files are self-hosted, small, and cached offline; no font CDN.
- `src/sw.js`, `src/pwa.tsx`, `vite.config.js`: content-versioned offline shell, cache cleanup, and a waiting-worker update prompt. Updating waits for safe save state.

Each workspace stores `{ revision, journal }`, where a journal has routines, history and `draft | null`. Workouts/lifts/sets have stable IDs. Timestamps are milliseconds. Sets use string inputs so incomplete edits remain editable; weight is canonical kg, with optional original entered value/unit for exact display round-trips. Timed sets use `seconds` instead of reps. The 0–1000 kg canonical limit also applies to lb entries. Zero-weight progress uses reps. Records are never persisted.

**Maintenance rules:** keep training rules out of views; any DB schema change requires a version bump and tested migration; any full-backup format change requires a backup-version bump and continued v1/v2 import compatibility.

## Product vocabulary

Use these terms in new UI copy, documentation and screenshots:

| Term | Meaning |
|---|---|
| SetTrack | Product name; preserve this capitalization |
| My journal | The user's personal routines, history and active draft |
| Demo journal | Separate sample data for exploring the app |
| Routine | A reusable exercise plan with target sets and reps or seconds |
| Workout | One training activity, either active or completed |
| Draft | The active workout before it is finished |
| Exercise | A library entry; use its existing display name |
| Set | One logged weight/reps, bodyweight/reps or duration entry |
| Personal best | The best valid completed set for an exercise |
| Full backup | Routines, completed workouts and active draft in one file |
| Spreadsheet | CSV containing completed workout history only |

Use **workout**, rather than session, in product copy. Use **exercise**, rather than lift, where the screen also supports bodyweight or timed exercises. Keep internal IDs, database keys and backup fields stable; copy changes do not require renaming stored data.

Overview totals cover the **last seven local calendar days**, including today; they are not calendar-week totals. Training streaks count consecutive Monday-based weeks with a completed workout, allowing the current week to be empty until the next workout. Load volume is weight × reps; it does not estimate body mass or include timed duration.

## Local verification

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Playwright starts the production preview automatically. It checks desktop and phone layouts, offline reloads, worker updates, import safety, unit entry, edits and storage failures. Axe checks Overview, Workout, History, Progress and Your data in both themes.

For repeatable visual checks, start `npm run preview` in another terminal:

```sh
npm run screenshots
npm run audit
```

Screenshots are written under `docs/screenshots/`. Lighthouse uses installed Chrome or `SETTRACK_CHROME=/path/to/chrome`; reports are saved locally under `.notes/`. Real vibration, sound, screen locking, native sharing and iOS behavior still need physical-device verification.
