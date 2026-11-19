# SetTrack

[Open the live demo](https://naumansaeed0.github.io/settrack/)

SetTrack is a strength-training journal that puts your previous sets beside today’s entries. It saves active workouts in the browser, so you can close the tab and pick up where you left off.

## Try it in under a minute

1. On **Overview**, start **Upper Body A**.
2. Look at the previous Bench Press set (**60 kg × 8**). Enter **62.5** in the first weight field and mark the set complete.
3. Select **Finish workout**, then **Save workout**. The summary highlights your new heaviest set.
4. Select **View progress** to see the new weight on the chart.

Use **Demo journal → My journal** to start with a separate, empty workspace. Both journals use browser-local storage.

## What’s inside

- A routine builder with a searchable exercise picker during workouts and editable set and rep targets in routines.
- An active workout log with previous-session values, draft recovery, and a 90-second rest timer.
- Session summaries, workout history, per-lift charts, and the underlying chart values in a table.
- Offline access after the first successful visit to the production build.

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

`npm run preview` serves the production build for testing offline reloads locally.

## Implementation

React and TypeScript handle the interface. The training rules live separately from the views in `src/training.ts`. IndexedDB saves each workspace as one versioned snapshot. Finishing a workout clears its draft and adds its completed sets in the same transaction. A revision check prevents a stale tab from overwriting a newer save.

The rest timer stores a deadline so elapsed time stays accurate through reloads and backgrounding. The progress chart uses the heaviest completed set per session. A record is a strict increase over an earlier mark. Vite builds the static app and generates its offline asset list. Deploy with `npm run deploy`, which builds locally and publishes only `dist/` (including `.nojekyll`) to `gh-pages`. Pages must serve **gh-pages / (root)**. No GitHub Actions workflow is used. Deep links use hashes, for example `/settrack/#history`.

Training data lives in the current browser profile. Clearing site data removes the saved journal.
