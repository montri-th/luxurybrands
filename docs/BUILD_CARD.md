# CityMETER Luxury Brands — first useful value

This Build Card records the first-use contract for this research demo. It uses LDS 0.9.7, release `v0.9.7-owner.1`, standalone document `lds-0.9.7-landometer-standalone-r1`, SHA-256 `d3085cbc0a50195f1cbf0c77b1d77c0d19b84364daf2948eb367348d65432d96`. It is not a blanket conformance or browser-pass certificate.

## First Aha — AHA-01

**First useful understanding:** แบรนด์ในข้อมูลที่เลือกกระจุกตัวอยู่ในย่านใด และย่านเหล่านั้นมีแบรนด์ใดร่วมกัน ผู้ใช้เริ่มสำรวจจากระดับย่านได้ โดยไม่ต้องเรียนรู้ตัวกรองทุกตัวก่อน

Default copy: **“3 ย่านรวม 85.8% ของแบรนด์”** — สยาม พร้อมพงษ์ และชิดลม–เพลินจิต พบรวม **97 จาก 113 แบรนด์** ในข้อมูลที่เลือก จาก **175 ใน 345 รายการจุดขาย**

**One useful action:** “สำรวจ 3 ย่าน”. Select the same source rows through the returned `areaIds`, using fixed point-in-polygon membership; preserve their source coordinates and use that selected set consistently in map, counters, chart and table. The focused action is “กลับไปดูทั้งหมด”, which clears the extra area selection while preserving the underlying filters. A separate visible control can clear the selected geography. When a filter changes, recompute the insight and denominator; do not retain the default figures as if they described the new selection. The share URL uses `areas=siam,phrom-phong,chit-lom-phloen-chit` for the default action.

The compact insight appears before filters in the existing sidebar. On narrow portrait screens, the same finding and action appear in a compact map card above the legend, without reducing map viewport dimensions. Pin labels avoid that card. No onboarding modal, decorative left rail or bracket accent is used.

## Evidence cue and calculation

Sources: [data/luxury.json](../data/luxury.json) and the ten fixed polygons in [data/neighborhoods.geojson](../data/neighborhoods.geojson), checked 2026-10-21. Calculation: [summarizeAreaInsight](../js/area-insight.js), applied to rows already selected by `filterRows`. Rank neighborhoods by distinct source brand labels, then POS count, then stable area ID; take at most three. Count the union of brands across their rows; do not add the per-area brand counts. The share denominator is all distinct brands in the selected rows, including rows outside the ten polygons or without a usable point. POS denominator is every selected observation row. `assignedPos` counts all selected rows assigned to any of the ten areas, independently of the top-three cutoff.

| Default area | Fixed area ID | POS | Distinct brands within area |
|---|---|---:|---:|
| สยาม | `siam` | 64 | 57 |
| พร้อมพงษ์ | `phrom-phong` | 56 | 51 |
| ชิดลม–เพลินจิต | `chit-lom-phloen-chit` | 55 | 45 |

The three area counts sum to 153 brand appearances, while their union is **97 brands**. Default scope is 345 research POS observations after excluding four unresolved closure conflicts; the total brand denominator is 113. The 175/345 POS share is 50.7%. Across all ten polygons, **244 of the 345 rows are assigned**; the other 101 remain outside the area selection. These are descriptive shares within this selected research dataset, not a market-completeness claim, independent storefront count, sales measure, business-success prediction or evidence of consumer behavior. Polygon membership follows the fixed analytical boundaries documented in [NEIGHBORHOOD_METHOD.md](NEIGHBORHOOD_METHOD.md), without nearest-area assignment.

The pure API returns `{areas, areaIds, brands, totalBrands, share, pos, totalPos, assignedPos}`. `filterAreaRows(rows, geojson, areaIdsSet)` assigns each usable point once, then intersects the requested area IDs. It returns the original row references in original order. Shared edges use the same fixed priority as the map, even when the winning area is not selected; missing, null, invalid and nonnumeric coordinates cannot acquire an area. Neither function changes source coordinates.

If no area has a selected point, preserve the selected totals and hide the area-specific insight. Do not translate a zero assigned-area numerator into “no luxury brands here”. An empty selection needs a clear empty state and a reset route.

## Prerequisites and safe paths — AHA-01-A / AHA-01-B

- **Essential for the area insight:** the public core dataset and valid fixed-neighborhood polygons must load and parse on an HTTP(S) origin. A local-file delivery must use the provided bridge/safe route; do not bypass browser origin protections.
- **Not prerequisites:** account registration, personal information, location permission, device permissions, sharing, promotional prompts, chart libraries, WebGL, map tiles, building geometry or a brand-logo image.
- Render the textual area insight when its data and boundaries are ready. Core counts, filters, source links and table remain usable if optional boundary geometry fails; in that case the area insight is hidden rather than fabricated. Optional MapLibre/amCharts resources load separately; a map/vendor failure must leave the available insight and table usable. The table is the safe read-only route when the map cannot run.
- First run, unauthenticated use, denied permissions and no-sharing use must retain the earliest feasible value and a useful next action. This demo does not request location or sharing permission to calculate the insight.
- A missing core dataset needs an actionable error/retry route. A missing optional context resource must not be presented as proof that the core dataset is empty.

## Icon contract — ICON-01

UI icons use the approved Material Symbols Rounded nav-7 subset: `open_in_new`, `menu`, `close`, `light_mode`, `dark_mode`, `contrast`, `groups`. Canonical axes remain `FILL 0`, `wght 300`, `GRAD 0`, `opsz 24` for this supplied subset. The packaged font is `assets/icons/material-nav-300.woff2`, SHA-256 `d7e283106ed2898726b24504c4e0f5ad524292984a90a4d29553c7dcf53b9657`; its Apache 2.0 license is retained.

The first-insight map action remains a visible text button because the approved subset has no exact map-action glyph. Do not borrow a people/group glyph to imply neighborhood geometry. `menu` is used only for the mobile filter panel; help, table-opening and chart actions retain visible text. Actual close actions and theme controls use their matching approved glyphs; `open_in_new` marks only links whose actual target is a new browsing context. Keep icon style separate from original brand identity images and categorical data symbols. Active states use meaningful surface, outline and text treatment while keeping icon fill/weight unchanged. Retain visible labels and focus when an icon font fails.

## Verification scope

[area-insight.test.js](../tests/area-insight.test.js) checks the real default snapshot and exact area IDs, distinct-brand ranking, brand union across areas, shared-edge assignment, filtered denominators, missing/invalid geometry, unavailable boundaries, empty cases, map feature identities and input immutability. Its seven tests passed on 2026-10-21. These tests establish numerical/source-selection behavior. They do not test the app's URL parsing, focused-state text or return-button integration. Actual first-paint visibility, map action and restoration, responsive Thai layout, keyboard operation, vendor failure and browser behavior remain separate integration checks.
