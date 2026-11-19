# Deployment and branch roles

[← SetTrack](../README.md) · [Data guide](data-guide.md) · [Architecture](architecture.md) · [Deployment](deployment.md)

## Why there are two branches

| Branch | Contains | Updated by |
|---|---|---|
| `main` | React/TypeScript source, tests, documentation and screenshots | Normal development commits and feature merges |
| `gh-pages` | Production HTML, hashed assets, icons, fonts, licenses and service worker | `npm run deploy` |

These branches represent different artifacts. Do not merge `gh-pages` into `main`, or merge source files into `gh-pages`. A deployment publishes a fresh build from a source commit. Feature branches should merge into `main` after review and verification; there are currently no outstanding feature branches.

Deployment commits are named `Deploy SetTrack from <short SHA>: <source commit title>`, so each published build can be traced back to its source. Existing published commit history is retained.

## Publish

Vite's base is **`/settrack/`**. Commit every change first:

```sh
npm run deploy
```

The `predeploy` hook rejects a dirty working tree, runs `npm test`, then builds. Failure stops deployment. The deploy command publishes only `dist/` to `gh-pages`, including `.nojekyll`, and removes legacy source/workflow files from that branch. GitHub Pages must use **Deploy from branch → gh-pages → / (root)**. The owner’s GitHub Actions account is locked, so no repository Actions workflow or billing setup is used. GitHub may still list its own generated `pages-build-deployment` workflow for branch-based Pages; that is the successful Pages publishing mechanism, not a source workflow to remove.

Repository About fields require account permissions beyond code publishing. With an authorized account:

```sh
gh repo edit naumansaeed0/settrack \
  --description "Offline-first strength-training journal and PWA" \
  --homepage https://naumansaeed0.github.io/settrack/ \
  --add-topic react --add-topic typescript --add-topic vite \
  --add-topic pwa --add-topic fitness --add-topic offline-first --add-topic workout-tracker
```

## Check the release

1. Confirm Pages shows **Deploy from branch → gh-pages → / (root)** and a successful build.
2. Open the live site and confirm it renders the new interface. Check the console and asset responses, not only the HTML status.
3. Reload `#history`, then go offline and reload it again. Log a set and check that the draft survives another reload.
4. A returning visitor may see **Update available**. Save changes and use the update prompt to activate the waiting worker. Only obsolete SetTrack shell caches are removed; journal data stays in IndexedDB.

The repository About description, website and topics require owner permissions. The available integration previously returned HTTP 403 for those settings; publishing code and the Pages branch is supported.
