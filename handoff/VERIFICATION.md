# Verification record — release 0.3 (2026-10-22)

Dataset snapshot: 2026-10-21. Levels are reported separately: unit tests, rendered harness, live browser checks and live byte attestation. None of them is a blanket LDS, accessibility or market-completeness certificate. The 0.2 record is kept at the end for continuity.

## Automated (unit)

`npm test` — **80/80 passed** (Node 22) on the release working tree:

- area Aha, area membership, brand union, denominators (`area-insight.test.js`)
- chart model: ranking, matrix cells incl. zero, exclusive/shared before top-N (`chart-model.test.js`)
- count scale: exact LUT/anchors/class projections, equal-interval closed intervals, measured zero vs no data, label contrast ≥ 4.5:1 (`scales.test.js`)
- panel models: overview insights, neighborhood profile partition, whole-selection reference, venue and brand presence, geometry precision and status wording, EVID-05 area states (`profile-model.test.js`)
- pins: bounded slots, logo ceiling and priority, co-location identities (`pins.test.js`)
- **vector tiles**: MVT reader on a multi-layer fixture (`tests/fixtures/mvt-sample.pbf`), tile maths (`mvt.test.js`)
- **geometry**: ring cleaning, clipping, outward offset, fillets that keep every original vertex inside the rounded ring (`geometry.test.js`)
- **massing**: focus selection, lift, enclosure, hide_3d, host-twin removal and hiding, tile planning bound, rounding radius 3–12 m; `installMassing` on a fake map: onResult for applied/empty results, cached repeats, plan/3D visibility; **eye scene**: opacities, unique feature ids, screen-space occluders in front of a target only, restore on leaving (`massing.test.js`)
- **basemap / camera / breadcrumb / provinces**: style structure and layer anchors, `--basemap-*` palette, camera presets, breadcrumb three- and four-level rules (venue inside a core, venue outside every core, plain venue label, store never a crumb, fold behind “…”), production province codes (`map-style.test.js`)
- model, neighborhoods (incl. provinceCode), brand logos, first-insight compatibility

Machine contracts (`product-statement.json`, `product-brief.json`, `implementation-plan.json`, generated `handoff-manifest.json`) validate against `handoff.schema.json` 1.2.0 (ajv 2020-12, 2026-10-22).

## Rendered harness (Playwright, Chromium, container)

The test container cannot reach unpkg.com or tiles.openfreemap.org. The harness serves the repository on 127.0.0.1:4173, fulfils the pinned MapLibre 5.6.2 JS/CSS from an npm-vendored copy, answers the TileJSON URL with a stub that points at **synthetic OpenMapTiles-schema tiles** (62 tiles, z0–14: building with render_height/render_min_height, transportation, water, park, place) and aborts glyph requests. Data, layers, pins, labels, panel, charts, table, the generated style, the massing decoder and the camera are the real code paths; only the geography of the basemap is synthetic, so the real-tile look is confirmed live (next section).

| Viewport / theme | Flows checked | Result |
|---|---|---|
| 1280×800 light | first paint = city preset (z13.53, pitch 56, bearing 28) with auto focus `siam, phrom-phong, chit-lom-phloen-chit` (175 rows), crumb ประเทศไทย; ดูทุกย่าน; charts ranking/mix/compare (matrix cell widths all 89 px); Siam profile (model preset z15.91, pitch 60, FOV 14; 37 rounded focus buildings; crumbs ประเทศไทย › กรุงเทพมหานคร › สยาม); มุมสถาปนิก disabled in neighborhood mode; venue Siam Paragon → eye preset (z17.42, pitch 82, FOV 32) fitted on the host footprint, crumbs … › สยาม › Siam Paragon, toggle pressed, scene eye (focus opacity 0.62, city 0.3, 3 occluders see-through), only Paragon blue; toggle → model (pitch 60, FOV 14) and `?cam=model`; back → scene restored; store (crumbs end at Siam Paragon, heading A. Lange & Söhne, eye kept); 2D plan; table; crumb-country; help | pass — no page errors |
| 1280×800 dark | same flows after switching theme | pass — same data HEX, dark basemap tokens, readable matrix ink |
| 390×844 light + dark (DPR 2, touch) | overview with compact map Aha; bottom sheet; neighborhood via ranking (plan while the sheet is open); charts and matrix in the tray; store via tap (crumbs fold to … › สยาม › Siam Paragon) | pass — no horizontal document overflow |
| keyboard | Tab to the first focus pin, ArrowRight, Enter → store mode; context pins not focusable; matrix cell ink/background pairs read | pass |
| states | `?segment=watches`, `?search=zzzz` (empty state + clear), `?neighborhood=siam&view=mix`, `?province=PKT` (crumbs ประเทศไทย › ภูเก็ต, venue ranking fallback), `?areas=all&view3d=0` (plan, every area filled) | pass |

Fixed during this pass: context dots were taking the category colour because `logos.css` loads after `styles.css` (equal specificity) — now grey regardless of category.

Console: only Chromium software-WebGL notices and the expected missing-source-layer warnings of the synthetic tiles (landcover, landuse, aeroway, waterway, water_name are not generated); no application errors.

## Live checks (Chrome on macOS, real tiles)

Recorded after the Pages run of the release commit — see the dated entries below. If this section still reads “pending”, the release has not been verified live and must not be reported as published.

- pending

## Live byte attestation

`npm run verify:live` compares SHA-256 of every published file in the generated manifest with the bytes served by GitHub Pages (`cache: no-store`, cache-busting query). The result for this release is in `evidence/live-attestation.json` inside the bundle and summarised in `RELEASE_RECEIPT.json`. The manifest itself is generated from `git ls-files` of the release commit and is not tracked in git, so it cannot drift from the bytes it describes.

## Evidence files in the bundle

`evidence/` holds the harness screenshots (`d-*`, `m-*`, `a11y-*`, `s-*`) and `live-attestation.json`. Harness screenshots show the synthetic basemap; the live Chrome checks were observed interactively and are described, not attached.

---

## Release 0.2 (2026-10-22) — retained record

Unit 62/62; harness with stub style JSON (no tiles); live spot checks on the published commit: overview choropleth under Positron roads, explore-3 focus/quiet with 40 context dots, Siam profile with host buildings and logos at zoom ≥ 13.5, dark theme. Not re-verified: native `file:` entry (AC02), fault injection (AC03/AC05), Safari.
