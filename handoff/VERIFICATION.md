# Verification record — release 0.2 (2026-10-22)

Dataset snapshot: 2026-10-21. Levels are reported separately: unit tests, rendered harness, live browser spot checks and live byte attestation. None of them is a blanket LDS, accessibility or market-completeness certificate.

## Automated (unit)

`npm test` — **62/62 passed** (Node 22) on the release working tree:

- area Aha, area membership, brand union, denominators (`area-insight.test.js`)
- chart model: ranking, matrix cells incl. zero, exclusive/shared before top-N (`chart-model.test.js`)
- count scale: exact LUT/anchors/class projections, equal-interval closed intervals, measured zero vs no data, label contrast ≥ 4.5:1 (`scales.test.js`)
- panel models: overview insights, neighborhood profile partition exclusive + shared = brands, whole-selection reference, venue and brand presence, geometry precision and status wording, EVID-05 area states (`profile-model.test.js`)
- pins: bounded slots, logo ceiling and priority, co-location identities (`pins.test.js`)
- model, neighborhoods, brand logos, first-insight compatibility (`model.test.js`, `neighborhoods.test.js`, `brand-logos.test.js`, `first-insight.test.js`)

Machine contracts (`product-brief.json`, `implementation-plan.json`, generated `handoff-manifest.json`) validate against `handoff.schema.json` 1.1.0.

## Rendered harness (Playwright, Chromium, container)

Because the test container cannot reach unpkg.com or tiles.openfreemap.org, the harness serves the repository on 127.0.0.1:4173, fulfils the pinned MapLibre 5.6.2 JS/CSS from an npm-vendored copy and answers the two style URLs with a stub style (background + empty line/symbol layers). Data, layers, pins, labels, panel, charts and table are the real code paths; only basemap tiles are absent.

| Viewport / theme | Flows checked | Result |
|---|---|---|
| 1280×800 light | overview Aha + ranking; charts ranking/mix/compare; explore 3 areas; Siam profile; venue (Siam Paragon); store (pin click, popup); table overlay; help dialog | pass — no page errors; 63 focus pins / 9 context pins in Siam |
| 1280×800 dark | same flows after switching theme | pass — same data HEX, dark basemap style, readable matrix ink |
| 390×844 light + dark (DPR 2, touch) | overview with compact map Aha; bottom sheet; neighborhood via ranking (sheet open, area framed above the sheet); charts and matrix in the tray; store via tap | pass — no horizontal document overflow |
| keyboard | Tab to the first focus pin, ArrowRight, Enter → store mode; context pins are not focusable | pass |
| states | `?segment=watches`, `?search=zzzz` (empty state copy + clear action), `?neighborhood=siam&view=mix` (highlighted row), `?province=Phuket` (rows outside all cores → venue ranking fallback, all areas measured zero, no legend classes) | pass |

Console: only Chromium software-WebGL performance notices; no application errors or warnings after the zoom-expression fix in `map-layers.js`.

## Live spot checks (Chrome on macOS, 1512×804, real tiles)

Checked on the published commit after the Pages run completed:

- Overview: choropleth under Positron roads, labels with counts, quiet tiny pins, Aha 86% / 97 of 113 brands, ranking list with class-coloured bars.
- Explore 3 areas: only Siam, Phrom Phong and Chit Lom–Phloen Chit keep fill; others outline-only with quiet labels; 40 context dots reported in the status line; logos appear at zoom ≥ 13.5.
- Siam selected: selected outline, host buildings in `map.activeLayer`, category pins with logos, legend switches to pins/buildings at detail zoom; profile with segment bars, venues, 14 exclusive / 43 shared brand chips with logos.
- Dark theme: dark basemap, same analytical HEX, matrix readable, selected row outlined.

Not re-verified in this release: native `file:` entry (AC02), fault injection of core data and MapLibre timeout (AC03/AC05) — the code paths are unchanged from 0.1 and were source-checked only; Safari.

## Live byte attestation

`npm run verify:live` compares SHA-256 of every published file in the generated manifest with the bytes served by GitHub Pages (`cache: no-store`, cache-busting query). The result for this release is in `evidence/live-attestation.json` inside the bundle and summarised in `RELEASE_RECEIPT.json`. The manifest itself is generated from `git ls-files` of the release commit and is not tracked in git, so it cannot drift from the bytes it describes.

## Evidence files in the bundle

`evidence/` holds the harness screenshots listed above (`d-*`, `m-*`, `a11y-*`, `s-*`) and `live-attestation.json`. Screenshots from the harness show the stub basemap; the live Chrome checks were observed interactively and are described, not attached.
