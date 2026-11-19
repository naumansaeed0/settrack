# SetTrack

[Open the live demo](https://naumansaeed0.github.io/settrack/)

SetTrack is a strength-training journal that puts your previous sets beside today’s entries. It saves active workouts in the browser, so you can close the tab and pick up where you left off.

## Try it in under a minute

1. On **Overview**, start **Upper Body A**.
2. Look at the previous Bench Press set (**60 kg × 8**). Enter **62.5** in the first weight field and mark the set complete.
3. Select **Finish workout**, then **Save workout**. The summary highlights your new heaviest set.
4. Select **View progress** to see the new weight on the chart.

The demo is clearly marked as sample data. **Use my journal** opens your separate workspace, with optional editable starter routines and no sample history. SetTrack remembers your workspace for the next visit.

Use **Demo journal → My journal** to start with a separate, empty workspace. Both journals use browser-local storage.

## What’s inside

- A routine builder with a searchable exercise picker during workouts and editable set and rep targets in routines.
- An active workout log with previous-session values, draft recovery, a configurable rest timer with vibration/sound, and screen keep-awake when supported.
- Per-workspace kg/lb preferences, with weights stored canonically in kilograms.
- Validated JSON backups, confirmed imports, and editing/deletion of past workouts and sets.
- Searchable workout history with exercise and period filters, plus **Repeat workout** to start from a past session with fresh, unchecked sets.
- One-tap **Use last weights** for empty entries, new sets that reuse the previous values, named drafts, and confirmed removal of draft sets/exercises.
- Session summaries, selectable lift charts on Overview, detailed per-lift progress, and the underlying chart values in a table.
- An installable PWA with maskable icons, dark mode, offline access after installation, and an update prompt that preserves saved journal data.

## Screenshots

![Training overview](docs/screenshots/overview.png)

<img src="docs/screenshots/logging-set-phone.png" width="320" alt="Logging a 62.5 kg Bench Press set on a phone, with the rest timer and workout actions available" />

## Back up your training

Use **Export journal** at the bottom of the app to download all routines, past workouts, and the active draft for the selected workspace. Export Demo journal and My journal separately. **Import journal** validates the file before asking to replace that workspace; cancel leaves it unchanged. Bad files and unsupported versions show an error. Backups use format version 2 and migrate version 1 payloads (`data` → `journal`). Unit and timer preferences are separate device settings.

The app requests persistent storage, but the browser decides whether to grant it. IndexedDB/private-mode/quota failures show an error; if a save fails, export the unsaved journal before reloading. There is no server copy.

Open a workout in **History → Edit workout** to correct its name, date, weights, or reps, or delete individual sets. Set deletions take effect on **Save changes**. Deleting an entire workout requires confirmation.

On phones the timer stays compact beside **Finish workout**; open **Options** to adjust the timer or discard the draft. During a workout, set **Rest seconds** (5–3600); completing a set starts that duration. Sound requires an interaction with the page, and vibration/wake lock depend on device and browser support. A visible notice also announces the timer ending. Backgrounded or locked mobile browsers may delay alerts until the app resumes.

## Run locally

Use Node.js 24 or newer.

```sh
npm install
npm run dev
```

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

`npm run preview` serves the production build at **http://localhost:4173/settrack/**. Deep links use hashes (for example `http://localhost:4173/settrack/#history`) so they reload correctly on static hosting.

## Publish without GitHub Actions

```sh
npm install
npm test
npm run build
npm run test:e2e
npm run deploy
```

`deploy` builds and publishes the **contents** of `dist/` to `gh-pages`, including `.nojekyll`. In **Settings → Pages**, choose **Deploy from a branch → gh-pages → / (root)**. Never publish the source `index.html`: it references TypeScript that a static host cannot execute. No Actions workflow or GitHub billing setup is required.

To update the repository's About section with an account that has repository administration access:

```sh
gh repo edit naumansaeed0/settrack \
  --homepage https://naumansaeed0.github.io/settrack/ \
  --add-topic react --add-topic typescript --add-topic vite \
  --add-topic pwa --add-topic fitness --add-topic workout-tracker --add-topic offline-first
```

Browser coverage includes desktop and phone offline logging, hash-route reloads, backup restoration, past-workout editing/deletion, unavailable storage and quota failures, workspace units, device-API fallbacks, icon dimensions/tap targets/dark mode, and a real waiting-service-worker upgrade. The additional usability coverage checks demo-to-personal onboarding, remembered workspaces and browser navigation, history filters, repeated sessions, one-tap weight entry without overwriting edits, confirmed draft cleanup, compact timer expansion, lift selection, and overflow at 320px/768px. Device APIs are simulated for repeatable assertions; physical vibration, audible sound and OS screen-lock behavior still need a real-device check.

## Implementation

React and TypeScript handle the interface. The training rules live separately from the views in `src/training.ts`. IndexedDB saves each workspace as one revision-checked snapshot. The existing database schema remains at version 1; this change does not alter its object stores. Finishing a workout clears its draft and adds its completed sets in the same transaction. A revision check prevents a stale tab from overwriting a newer save.

The rest timer stores a deadline so elapsed time stays accurate through reloads and backgrounding. The progress chart uses the heaviest completed set per session. A record is a strict increase over an earlier mark. Vite builds the static app and generates its offline asset list. Deploy with `npm run deploy`, which builds locally and publishes only `dist/` (including `.nojekyll`) to `gh-pages`. Pages must serve **gh-pages / (root)**. No GitHub Actions workflow is used. Deep links use hashes, for example `/settrack/#history`.

Training data lives in the current browser profile. Clearing site data removes the saved journal.
