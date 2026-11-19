# Repository cleanup review

[← Documentation index](README.md)

Reviewed 19 November 2026. Cleanup uses new conventional commits; published history is retained.

## Source branch

- Removed the unused, unreferenced `src/hero.webp` image. Its license/source attribution was not documented.
- `dist/`, `node_modules/`, temporary verification notes and Playwright output were already untracked and ignored.
- Expanded `.gitignore` to cover local environment files, editor/OS files, logs, temporary files, coverage output and Playwright blob reports. Example environment files can still be committed.
- Retained the four README screenshots, cover artwork, source, tests, fixtures, lockfile, build/deploy scripts and font licenses because they are used or referenced.
- Added a [documentation index](README.md). No raw Lighthouse JSON reports are tracked; audit output stays ignored under `.notes/`. The plant project's Round 1/2 reports and guides do not exist in SetTrack.
- Added the project MIT license, npm license metadata and full notices for shipped third-party components.

## Branches and published files

Only `main` and `gh-pages` exist remotely. There are no stale feature branches to delete. They have different roles and both are retained: source on `main`, generated site on `gh-pages`.

The deployment script replaces the generated branch contents with `dist/`. The existing deployment test publishes to a temporary local Git remote and verifies that stale source/workflow files are removed, the `.nojekyll` file is retained and `main` stays unchanged.

The Pages tree was inspected: it contains the built shell, hashed JS/CSS/fonts, icons, manifest, service worker and license notices. Source directories, npm metadata, environment files and repository workflows do not belong there. The published JavaScript and CSS are public app code, as expected for a static website.

There is no `.github/workflows/pages.yml` on `main` or `gh-pages`. GitHub's generated `pages-build-deployment` workflow supports branch-based Pages and is retained. The owner account's Actions lock and the branch publishing approach are documented in the README and deployment guide.
