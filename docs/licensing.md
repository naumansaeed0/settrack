# Licensing review

[← Documentation index](README.md)

Reviewed 19 November 2026 against the installed packages and tracked files.

## SetTrack

[MIT License](../LICENSE), copyright 2026 **naumansaeed0**. The repository owner's public GitHub profile has no display name; the verified account name is used rather than guessing a legal name.

The license applies to SetTrack's own source, documentation and project-authored artwork, including the local SVG cover and marks. Third-party components keep their own licenses. The npm manifest and lockfile identify SetTrack as MIT; `private: true` still prevents accidental npm publication.

## What ships in the browser

Full upstream copyright and license texts are preserved together in [THIRD_PARTY_NOTICES.txt](../public/THIRD_PARTY_NOTICES.txt), copied unchanged from the installed distributions. This file and the project LICENSE are published with the app and included in the offline shell.

| Component | Installed version | License / attribution |
|---|---|---|
| [React](https://github.com/facebook/react) | 19.1.0 | MIT; Meta Platforms, Inc. and affiliates |
| [React DOM](https://github.com/facebook/react) | 19.1.0 | MIT; Meta Platforms, Inc. and affiliates |
| [Scheduler](https://github.com/facebook/react) | 0.26.0 | MIT; Meta Platforms, Inc. and affiliates |
| [Vite modulepreload helper](https://github.com/vitejs/vite/tree/v6.4.1) | 6.4.1 | MIT; VoidZero Inc. and Vite contributors. This is generated browser runtime, not the full Vite toolchain. |
| [Space Grotesk](https://github.com/floriankarsten/space-grotesk) | Fontsource 5.3.0 | SIL OFL 1.1; Space Grotesk Project Authors. [Full notice](../public/fonts/LICENSE-space-grotesk.txt) |
| [IBM Plex Mono](https://github.com/IBM/plex) | Fontsource 5.3.0 | SIL OFL 1.1; IBM Corp. [Full notice](../public/fonts/LICENSE-ibm-plex-mono.txt) |

Fonts remain under OFL, not MIT. No fonts are modified or sold separately. Their original notices stay in `public/fonts/` and the production build. The build copies the root MIT license to `dist/LICENSE`; Vite copies the third-party notice from `public/`.

## Development and verification tools

These tools run locally and are not included in the published app. Their upstream license terms remain applicable when obtaining or redistributing the tools themselves; npm distributions contain their notices. Links below point to the corresponding upstream license texts.

| Tool | Version | License |
|---|---|---|
| Vite build tool | 6.4.1 | [MIT and bundled dependency notices](https://github.com/vitejs/vite/blob/v6.4.1/LICENSE.md) |
| TypeScript | 5.9.2 | [Apache-2.0](https://github.com/microsoft/TypeScript/blob/v5.9.2/LICENSE.txt) |
| React / React DOM type definitions | 19.1.10 / 19.1.7 | [MIT](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/LICENSE) |
| Playwright Test | 1.55.0 | [Apache-2.0](https://github.com/microsoft/playwright/blob/v1.55.0/LICENSE) |
| axe Playwright integration / axe-core | 4.14.0 / 4.14.1 | [MPL-2.0](https://www.mozilla.org/en-US/MPL/2.0/) |
| fake-indexeddb | 6.2.8 | [Apache-2.0](https://github.com/dumbmatter/fakeIndexedDB/blob/master/LICENSE) |
| Chrome launcher | 1.2.3 | [Apache-2.0](https://github.com/GoogleChrome/chrome-launcher/blob/main/LICENSE) |
| gh-pages | 6.3.0 | [MIT](https://github.com/tschaub/gh-pages/blob/v6.3.0/LICENSE) |
| Lighthouse | 13.6.0 | [Apache-2.0](https://github.com/GoogleChrome/lighthouse/blob/main/LICENSE) |
| chrome-launcher, used by the audit script | 1.2.3 | [Apache-2.0](https://github.com/GoogleChrome/chrome-launcher/blob/main/LICENSE) |

This is an attribution review of shipped components and directly used tools, not a redistribution of the complete development dependency tree. Dependency versions and upstream terms should be rechecked when packages change.

## Asset and content findings

- Removed the unused `src/hero.webp`. It had no remaining code or documentation references and no accompanying source/license attribution; its provenance was unclear. It is no longer part of the current source tree or published site. Published Git history is preserved.
- All four retained screenshots are referenced by the README. The cover, app marks and icons are local project assets. No remote image or font CDN is used by the app.
- No unclear license was found among the retained bundled packages or fonts reviewed above.
