# Verification record — release 0.5 (2026-10-22)

Dataset snapshot: 2026-10-21. Levels are reported separately: unit tests, rendered harness, live browser checks and live byte attestation. None of them is a blanket LDS, accessibility or market-completeness certificate. The 0.4, 0.3 and 0.2 records are kept below for continuity.

## Automated (unit) — 0.5

`npm test` — **96/96 passed** (Node 22): the 92 tests of 0.4 plus `venue-logos.test.js` — registry validation (path traversal and bad mime rejected), lookup by center id then exact label (no fuzzy match on canonical names), markup (backplate colour, decorative alt, role caption), the venue panel with and without a registry, and the shipped registry: every asset in `assets/venue-logos/` matches its `data/venue-logos.json` sha256 and byte count, every link resolves, no Drive/private URLs; a partial registry must declare itself (`meta.count + meta.pending.length === meta.expected`, no pending key carries an asset).

**Registry state in 0.5.0: partial and declared.** The sheet records 50 files (81 venue labels, 39 centers). 33 files reached the install set byte-exact (sha256 as in the sheet) → 57 labels and 29 centers carry a logo; the 17 files in `meta.pending` (Central Ladprao, Rama 9, Bangna, Rama 3, Korat, ROAST8RY, Jungceylon, Fashion Island, The Mall Lifestore Tha Phra, Robinson Rama 9, ICONSIAM, Siam Square, Siam Center, Siam Takashimaya, Suvarnabhumi, Siam Kempinski, Siam Discovery) show the venue name only. Cause: the Drive connector returns files of this size as text that must be copied by hand, and the copies did not verify; completing the set is plan item N16 (transfer the verified files, rerun the build; no code change).

## Rendered harness — 0.5

The six 0.4 scenarios re-run without application errors on the 0.5.0 working tree (`harness-0.5.log`); `d-light-venue-two-point.png` / `d-dark-venue-two-point.png` show the Siam Paragon mark on its stone backplate in the venue heading (same HEX in both themes), `d-light-store.png` / `d-dark-store.png` the venue mark beside สถานที่ in the store facts, `d-light-neighborhood.png` the logos in the สถานที่ในย่าน rows. `venue-logos-contact-light.png` / `-dark.png`: all 33 marks legible on their registry backplates (white marks on `#182327`, dark marks on `#E5E9E6`, opaque JPEGs on their own white).

## Live checks — 0.5 (Chrome on macOS, real tiles)

_Recorded after the Pages run of the 0.5 commit — see the entry below once attested._

---

# Verification record — release 0.4 (2026-10-22) — retained record

Dataset snapshot: 2026-10-21. Levels are reported separately: unit tests, rendered harness, live browser checks and live byte attestation. None of them is a blanket LDS, accessibility or market-completeness certificate. The 0.3 and 0.2 records are kept below for continuity.

## Automated (unit) — 0.4

`npm test` — **92/92 passed** (Node 22) on the release working tree: the 81 tests of 0.3 plus

- **venue x-ray** (`venue-xray.test.js`): solid geometry for a closed ring (walls, roof, edges, origin-relative offsets, shade range, top/base heights), holes / parts with a base / MultiPolygons, 64-bit matrix helpers, scissor box (padded, full-screen when a vertex is behind the camera, null when nothing projects), the custom layer on a fake map + fake GL (inserted before the anchor, renderingMode 3d, draws solid + edges only in 3D from zoom 13, scissored depth clear before the draw, nothing drawn when disabled or empty, `hitTest` on the last frame, dispose), `solidHit` point-in-triangle, and the **draw-order contract**: `installMassing({beforeId: host extrusion})` yields city → focus → occluder → host → water-name.
- **provinces** (`provinces.test.js`): `data/provinces.geojson` (one frame per dataset province, production codes as ids, DOPA codes, closed rings inside Thailand, provenance metadata), `buildProvinceModel` (brands/rows per province, count classes, measured_zero under a narrow filter), `installProvinceLayers` (fill under the first basemap line, zoom windows, attribution, quiet frames with a selected province, click → onSelect, bounds, dispose), overview panel province list and pictogram markup, and the **pictogram contract**: `PICTOGRAM_CONTRACT` ↔ `material-pictogram-300.json` (glyph codepoints, sha256, bytes) ↔ `styles.css` `.pic-*` rules.

Machine contracts validate against `handoff.schema.json` **1.3.0** (adds `venueXrayContract`, `provinceContract`, `pictogramContract` to the product brief; ajv 2020-12, 2026-10-22).

## Rendered harness — 0.4

Same harness as 0.3 (vendored MapLibre 5.6.2, stub TileJSON, synthetic tiles). All six scenarios (desktop light/dark, mobile light/dark, a11y, states) pass without application errors; the 0.3 flows and figures are unchanged (first paint city preset z13.53 / auto focus 175 rows; Siam profile model preset z16.31 with 37 rounded buildings; Siam Paragon eye preset z17.5 / pitch 75 / FOV 24, 3 occluders; matrix cells 89 px; mobile without horizontal overflow; keyboard pin tour; states). New evidence:

| Check | Result |
|---|---|
| Venue x-ray, Central Embassy (`dbg-xray-embassy.png`) | podium (23.1 m) and tower (179 m) drawn as one blue shaded solid with edges on top of the synthetic massing; `__citymeter.state.xray` = 180 vertices, enabled, not failed; layer order city-massing → focus-massing-3d → focus-massing-occluding → luxury-venue-buildings-3d → venue-xray (custom layers are not listed by `getStyle().layers`; `map.getLayer('venue-xray')` exists); whole-mass fit: roof inside the frame at z17.0 |
| Rotated / tilted (`dbg-xray-rotated.png`, bearing 120, pitch 60) | solid stays visible and correctly self-occluded; context blocks that would cover it are overdrawn |
| X-ray off (`dbg-xray-off.png`) | style host layer alone (tinted by context) — the fallback path |
| Siam Paragon dark (`d-dark-venue-two-point.png`) | light-blue solid (dark activeLayer) with edges; pictograms on tiles and headings |
| Country view (`dbg-country.png`, z4.94, `?areas=all` + ดูทั้งหมด) | 9 province frames filled (BKK 112 brands darkest … 1-brand provinces lightest), legend “จังหวัด · จำนวนแบรนด์” 1–22 … 90–112, 9 province chips with the city glyph, panel list “จังหวัดที่มีแบรนด์ 9 จังหวัด”, `pictograms-ready` |
| Region (`dbg-region.png`, z9.6) | frames outline-only, legend back to ย่าน, neighborhoods visible, no province chips |
| Drill-down (`dbg-phuket.png`) | panel row ภูเก็ต → `?province=PKT`, crumbs ประเทศไทย › ภูเก็ต, z13.09, 21 สาขา, venue ranking fallback |

Console: as in 0.3 (software-WebGL notices, synthetic-tile missing-source-layer warnings); no application errors; no WebGL errors from the custom layer.

## Live checks — 0.4 (Chrome on macOS, real tiles)

Chrome on macOS, window 1710×909 CSS px (DPR 2), OpenFreeMap tiles; the owner's theme preference was restored to `auto` afterwards.

- **778a32a (first 0.4 publish, Pages run 39713290076, 09:47 ICT):** `npm run verify:live` 86/86 files (108-file manifest). Central Embassy venue page (`?neighborhood=chit-lom-phloen-chit&place=b5d400a8…`): build r12; layer order city-massing → focus-massing-3d → focus-massing-occluding → luxury-venue-buildings-3d → `venue-xray` (custom, present via `map.getLayer`) → water-name; eye preset z17.2 / pitch 75 / FOV 24 with the **whole mass in frame** (podium 23.1 m + tower 179 m); x-ray 180 vertices, enabled, not failed; `pictograms-ready`, `.pic-store` computed font “LDS Material Symbols Rounded Pictogram”, visible; 9 province frames loaded. Rotated to bearing −155 / pitch 72 / z16.4: the solid stays fully visible with focus-tier blocks in the foreground. **Found live:** MapLibre's own `queryRenderedFeatures` on the host layer hit the podium at the footprint but returned nothing on the tower wall away from the camera ray (points 595/300–420) — the reason the x-ray now hit-tests its own triangles (8b2e01b).
- **778a32a, country view (`?areas=all` + ดูทั้งหมด, z5.23, plan):** legend “จังหวัด · จำนวนแบรนด์” with classes 1–22 · 23–44 · 45–67 · 68–89 · 90–112; 9 province chips (กรุงเทพมหานคร 112, สมุทรปราการ 24, ภูเก็ต 20, เชียงใหม่ 7, นนทบุรี 2, ชลบุรี / ปทุมธานี / อุดรธานี / นครราชสีมา 1), 11 rendered fill features, 9 rows in “จังหวัดที่มีแบรนด์”. Clicking inside the เชียงใหม่ frame → `?province=CMI&areas=all`, crumbs ประเทศไทย › เชียงใหม่, chip “Chiang Mai”, camera on the province's rows (นิมมาน + 7 สาขา), Aha “29% ของแบรนด์อยู่ใน 1 ย่านนี้”.
- **8b2e01b (0.4 hit-test, Pages run 39713887908, 10:1x ICT):** `npm run verify:live` 86/86. From the store ALAÏA (`?store=POS-137aaebdac17`), camera bearing 205 / pitch 72 / z16.4: scanning a 10-px grid, 225 points lie on the drawn solid, 224 of them also hit MapLibre's query and 1 only the x-ray; a real click on that point opened the venue (`?place=b5d400a8…`) and the eye preset re-framed the whole mass. Dark theme, camera west of the venue (bearing 110 / pitch 74 / z16.1): light-blue solid (dark activeLayer) drawn over the taller grey towers between camera and venue, 1 see-through occluder. Dark country view: same count HEX on the dark basemap, 9 chips (ink chip bg #182327, city glyph from the pictogram font), legend switched.
- Not re-checked live in 0.4: mobile width (harness only), keyboard tour (harness only), Safari, AC02/AC03/AC05.

---

# Verification record — release 0.3 (2026-10-22) — retained record

Dataset snapshot: 2026-10-21. Levels are reported separately: unit tests, rendered harness, live browser checks and live byte attestation. None of them is a blanket LDS, accessibility or market-completeness certificate. The 0.2 record is kept at the end for continuity.

## Automated (unit)

`npm test` — **81/81 passed** (Node 22) on the release working tree:

- area Aha, area membership, brand union, denominators (`area-insight.test.js`)
- chart model: ranking, matrix cells incl. zero, exclusive/shared before top-N (`chart-model.test.js`)
- count scale: exact LUT/anchors/class projections, equal-interval closed intervals, measured zero vs no data, label contrast ≥ 4.5:1 (`scales.test.js`)
- panel models: overview insights, neighborhood profile partition, whole-selection reference, venue and brand presence, geometry precision and status wording, EVID-05 area states (`profile-model.test.js`)
- pins: bounded slots, logo ceiling and priority, co-location identities (`pins.test.js`)
- **vector tiles**: MVT reader on a multi-layer fixture (`tests/fixtures/mvt-sample.pbf`), tile maths (`mvt.test.js`)
- **geometry**: ring cleaning, clipping, outward offset, fillets that keep every original vertex inside the rounded ring (`geometry.test.js`)
- **massing**: focus selection, lift, enclosure, hide_3d, host-twin removal and hiding, tile planning bound, rounding radius 3–12 m; `installMassing` on a fake map: onResult for applied/empty results, cached repeats, plan/3D visibility; **eye scene**: opacities, unique feature ids, screen-space occluders in front of a target only, restore on leaving; **distance fade** via feature-state (near 0, mid partial, far 1, rebuilt on new anchors) (`massing.test.js`)
- **basemap / camera / breadcrumb / provinces**: style structure and layer anchors, `--basemap-*` palette, camera presets, breadcrumb three- and four-level rules (venue inside a core, venue outside every core, plain venue label, store never a crumb, fold behind “…”), production province codes (`map-style.test.js`)
- model, neighborhoods (incl. provinceCode), brand logos, first-insight compatibility

Machine contracts (`product-statement.json`, `product-brief.json`, `implementation-plan.json`, generated `handoff-manifest.json`) validate against `handoff.schema.json` 1.2.0 (ajv 2020-12, 2026-10-22).

## Rendered harness (Playwright, Chromium, container)

The test container cannot reach unpkg.com or tiles.openfreemap.org. The harness serves the repository on 127.0.0.1:4173, fulfils the pinned MapLibre 5.6.2 JS/CSS from an npm-vendored copy, answers the TileJSON URL with a stub that points at **synthetic OpenMapTiles-schema tiles** (62 tiles, z0–14: building with render_height/render_min_height, transportation, water, park, place) and aborts glyph requests. Data, layers, pins, labels, panel, charts, table, the generated style, the massing decoder and the camera are the real code paths; only the geography of the basemap is synthetic, so the real-tile look is confirmed live (next section).

| Viewport / theme | Flows checked | Result |
|---|---|---|
| 1280×800 light | first paint = city preset (z13.53, pitch 56, bearing 28) with auto focus `siam, phrom-phong, chit-lom-phloen-chit` (175 rows), crumb ประเทศไทย; ดูทุกย่าน; charts ranking/mix/compare (matrix cell widths all 89 px); Siam profile (model preset z16.31 filling the frame, pitch 60, FOV 14; 37 rounded focus buildings; crumbs ประเทศไทย › กรุงเทพมหานคร › สยาม); มุมสถาปนิก disabled in neighborhood mode; venue Siam Paragon → eye preset (z17.53, pitch 75, FOV 24) fitted on the host footprint, crumbs … › สยาม › Siam Paragon, toggle pressed, scene eye (focus opacity 0.62, city 0.16, 3 occluders see-through), only Paragon blue; toggle → model (pitch 60, FOV 14) and `?cam=model`; back → scene restored; store (crumbs end at Siam Paragon, heading A. Lange & Söhne, eye kept); 2D plan; table; crumb-country; help | pass — no page errors |
| 1280×800 dark | same flows after switching theme | pass — same data HEX, dark basemap tokens, readable matrix ink |
| 390×844 light + dark (DPR 2, touch) | overview with compact map Aha; bottom sheet; neighborhood via ranking (plan while the sheet is open); charts and matrix in the tray; store via tap (crumbs fold to … › สยาม › Siam Paragon) | pass — no horizontal document overflow |
| keyboard | Tab to the first focus pin, ArrowRight, Enter → store mode; context pins not focusable; matrix cell ink/background pairs read | pass |
| states | `?segment=watches`, `?search=zzzz` (empty state + clear), `?neighborhood=siam&view=mix`, `?province=PKT` (crumbs ประเทศไทย › ภูเก็ต, venue ranking fallback), `?areas=all&view3d=0` (plan, every area filled) | pass |

Fixed during this pass: context dots were taking the category colour because `logos.css` loads after `styles.css` (equal specificity) — now grey regardless of category. Found live (first 0.3 publish, commit 55c24ca): with the eye preset at pitch 82 / FOV 32, MapLibre 5.6.2 drew fill-extrusion displaced (pitch 76) or not at all (pitch 82) wherever the horizon was inside the viewport — reproduced with a plain test box, independent of opacity, padding, source maxzoom and theme; pitch 73 rendered correctly. The eye preset is now pitch 75 / FOV 24 (horizon outside the frame).

Console: only Chromium software-WebGL notices and the expected missing-source-layer warnings of the synthetic tiles (landcover, landuse, aeroway, waterway, water_name are not generated); no application errors.

## Live checks (Chrome on macOS, real tiles)

Recorded after the Pages run of each release commit (Chrome on macOS, 1512×804, OpenFreeMap tiles).

- **55c24ca (first 0.3 publish, 07:10 ICT):** 3D first Aha live (city preset z13.98, auto focus, 1,319 rounded focus buildings from real tiles, crumb ประเทศไทย); paper basemap in light and dark; Siam Paragon venue in the eye preset with 8 see-through occluders. **Defect found:** Central Chidlom venue showed no buildings — reproduced as a MapLibre 5.6.2 fill-extrusion defect once the horizon is inside the viewport (pitch 82 / FOV 32); a plain test box behaved the same, independent of opacity, padding, source maxzoom and theme; pitch 73 rendered correctly, 76 displaced.
- **01c3f0e (0.3.1, 07:5x ICT):** `npm run verify:live` 79/79 files. Central Chidlom venue renders (eye preset z17.6, pitch 75, FOV 24; blue host, grey focus massing, city 0.16; 377 city buildings fade-stated; status “22 สาขา · โลโก้ 8/250 · บริบท 28”; crumbs ประเทศไทย › กรุงเทพมหานคร › ชิดลม–เพลินจิต › Central Chidlom). Dark theme overview after crumb-country: city preset z13.98, 1,319 focus buildings, 387 fade-stated buildings, city opacity 0.22, concise copy (86% ของแบรนด์อยู่ใน 3 ย่านนี้ · 97 จาก 113 แบรนด์ · 175 จาก 345 สาขา), metric tiles with legend symbols. Not re-checked live in 0.3.1: mobile width (harness only), keyboard tour (harness only).

## Live byte attestation

`npm run verify:live` compares SHA-256 of every published file in the generated manifest with the bytes served by GitHub Pages (`cache: no-store`, cache-busting query). The result for this release is in `evidence/live-attestation.json` inside the bundle and summarised in `RELEASE_RECEIPT.json`. The manifest itself is generated from `git ls-files` of the release commit and is not tracked in git, so it cannot drift from the bytes it describes.

## Evidence files in the bundle

`evidence/` holds the harness screenshots (`d-*`, `m-*`, `a11y-*`, `s-*`) and `live-attestation.json`. Harness screenshots show the synthetic basemap; the live Chrome checks were observed interactively and are described, not attached.

---

## Release 0.2 (2026-10-22) — retained record

Unit 62/62; harness with stub style JSON (no tiles); live spot checks on the published commit: overview choropleth under Positron roads, explore-3 focus/quiet with 40 context dots, Siam profile with host buildings and logos at zoom ≥ 13.5, dark theme. Not re-verified: native `file:` entry (AC02), fault injection (AC03/AC05), Safari.
