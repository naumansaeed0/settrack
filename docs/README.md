# SetTrack documentation

[← Project overview](../README.md)

| Guide | Read it for |
|---|---|
| [Data, backups and sharing](data-guide.md) | Device storage, recovery, restore safety, backup versions and the CSV format |
| [Architecture and maintenance](architecture.md) | Source map, design tokens and fonts, product vocabulary, schema rules and verification commands |
| [Deployment and branch roles](deployment.md) | Publishing without Actions, the roles of main/gh-pages and release checks |
| [Licensing review](licensing.md) | MIT scope, bundled libraries, fonts and development-tool attribution |
| [Repository cleanup review](cleanup-review.md) | Files retained/removed, ignored output, branch and Pages checks |

The [screenshots](screenshots/) and [cover artwork](cover.svg) are referenced by the project README. Generate fresh screenshots with `npm run screenshots` against the production preview.

Raw Lighthouse JSON and summaries are local verification output under `.notes/`, which is ignored. No raw Lighthouse reports are tracked, so there is nothing to move into a public report folder. SetTrack does not have the plant project's design-system guide, data-review document or Round 1/2 reports; those files were not invented or copied into this repository.
