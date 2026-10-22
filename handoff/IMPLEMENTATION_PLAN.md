# CityMETER Luxury Brands — Implementation Plan

รุ่นส่งต่อ 0.5 · ปรับเอกสาร 22 ตุลาคม 2569 · ข้อมูลตรวจถึง 21 ตุลาคม 2569 · ใช้คู่กับ [PRODUCT_BRIEF.md](PRODUCT_BRIEF.md), [PRODUCT_STATEMENT.md](../PRODUCT_STATEMENT.md) และ [implementation-plan.json](implementation-plan.json)

รุ่น 0.3 เปลี่ยนประสบการณ์แรกเป็น **เมือง 3 มิติที่โฟกัส 3 ย่านอันดับต้นทันที** บน basemap กระดาษที่สร้างเอง มีมวลอาคารสองชั้น (เมืองเงียบ / ย่านโฟกัสมุมโค้ง) กล้องแบบโมเดลเมืองและมุมสถาปนิก breadcrumb ที่ใช้รหัสจังหวัดของ production และตาราง matrix ช่องเท่ากัน พร้อม Product Statement ที่เขียนใหม่เป็น winning strategy รุ่น 0.4 (รอบสองของวันเดียวกัน) แก้ให้อาคารของสถานที่มองเห็นและกดได้เสมอ (ลำดับวาดของชั้น 3D + venue x-ray) เพิ่มกรอบจังหวัดพร้อม drill-down สำหรับมุมมองทั้งประเทศ และ pictogram จริงบน metric tiles (ข้อยกเว้นทดลองจาก LDS nav-7) รุ่น 0.5 นำโลโก้สถานที่จากทะเบียนของชีต research มาใช้ในแผง รายการ และรายละเอียดร้าน เป้าหมายของแผนนี้คือให้ developer หรือ coding agent รับช่วงต่อได้โดยไม่ต้องเดาสถานะ และรู้ว่าอะไรคือ display-only กับอะไรคือข้อมูล

## สถาปัตยกรรมที่มีจริง

Static HTML/CSS และ JavaScript ES modules ไม่มี build step ไม่มี framework ไลบรารีภายนอกเพียงตัวเดียวคือ MapLibre GL 5.6.2 จาก URL ที่ pin ไว้ใน `js/vendors.js` บริการภายนอกคือ tile และ glyph ของ OpenFreeMap (`https://tiles.openfreemap.org/planet`, OpenMapTiles schema) ซึ่งใช้ทั้งเป็น basemap และวัตถุดิบมวลอาคาร กราฟวาดเอง `npm start` เสิร์ฟผ่าน Python, `npm test` ใช้ Node test runner (Node ≥ 20) ไม่มี `node_modules`

| ไฟล์ | หน้าที่ | ข้อต่อที่ต้องรักษา |
|---|---|---|
| `index.html` | โครงหน้าจอ: header + toolbar (3D, มุมสถาปนิก), map panel + chrome, ถาดกราฟ, ตาราง, แผงอ่านข้อมูล (breadcrumb บนสุด), help dialog, launch overlay | DOM IDs ที่ `app.js` และ `navigation.js` ใช้; `?v=` บน entry files; ไม่มี CSV/caveat UI |
| `js/launch.js` | classic boot script, file bridge, loading/slow/error fallback | events `citymeter:ready`, `citymeter:load-error`; public origin คงที่ |
| `js/app.js` | state, สามขอบเขตข้อมูล + focus mode (`auto`/explicit/none), panel modes + back stack, breadcrumb, URL state, map lifecycle, camera calls, ติดตั้งชั้น spatial (areas → buildings → massing) | `update()` เป็นจุดเดียวที่คำนวณ selection และ `focusIds`; `updateSpatialLayers()` ส่ง regions/hosts ให้ massing |
| `js/model.js` | taxonomy, cohorts, ตัวกรองร่วม, summaries, point features, `PROVINCES` (รหัส production) | ไม่แก้แถวต้นทาง; POS กับ distinct brands แยกกัน; รหัสจังหวัดตรง production |
| `js/neighborhoods.js` | point-in-polygon, membership, สรุปย่าน | boundary คงที่; shared edge ใช้ priority แล้ว stable ID |
| `js/area-insight.js` | Aha 3 ย่าน และ area-focus filter | ตัวเศษ union, ตัวหารรวมนอกขอบเขต; `areaIds` คือ focus อัตโนมัติ |
| `js/chart-model.js` | โมเดลอันดับ/matrix/exclusive-shared | เทียบทุก assigned areas ก่อนตัด Top-N |
| `js/profile-model.js` | โปรไฟล์ย่าน สถานที่ ร้าน การมีอยู่ของแบรนด์ อันดับสถานที่ ระดับความแม่นพิกัด | pure; ใช้ `scopeRows` เป็นฐานเทียบ; ไม่ยกระดับความแม่น |
| `js/scales.js` | LDS `count` LUT 41 ค่า, class projection, EVID-05 states | ห้าม interpolate สีใหม่; HEX เดียวกันสองธีม |
| `js/map-style.js` | **ใหม่** basemap “paper” style v8 จาก `--basemap-*` tokens; anchors `DATA_FILL_BEFORE='waterway'`, `MASSING_BEFORE='water-name'` | สีมาจาก token เท่านั้น; ลำดับชั้นตาม brief; `name:th` ก่อน `name` |
| `js/map-layers.js` | choropleth + outline + selected layers, focus/quiet, HTML labels (`installAreaLabels` ใช้ร่วมย่าน/จังหวัด) | fill แทรกก่อน `waterway`, maxzoom 14.5; ป้ายจังหวัด < z9.5 |
| `js/pins.js` | หมุดรายสาขา, context pins, โลโก้ (zoom ≥ 14), keyboard | พิกัดต้นทางไม่เปลี่ยน; context pins ไม่มีโลโก้และไม่อยู่ใน tab order |
| `js/buildings.js` | อาคารที่ตั้ง/parts, coverage, `displayedFeatures()`, `HOST_LAYERS` | สี `map.activeLayer`; แสดงทั้ง 2D/3D; **ติดตั้งก่อนมวลอาคาร** (ลำดับวาด = ลำดับความลึก) |
| `js/venue-xray.js` | **ใหม่ 0.4** custom layer 3D: รูปทรงของสถานที่ (ผนัง/หลังคา earcut/เส้นขอบ) วาดทับทุกชั้นด้วย scissored depth clear + depth test ของตัวเอง; เมทริกซ์ 64 บิตคูณบน CPU | ชั้นสุดท้ายของรอบ 3D; เฉพาะ 3D และ zoom ≥ 13; `hitTest(point)` จากสามเหลี่ยมที่ฉายในเฟรมล่าสุด → กดได้ทุกจุด (app.js map click/mousemove); GL error → ปิดตัวเอง |
| `js/vendor/earcut.js` | earcut 3.2.4 (ISC) สำหรับหลังคา | ไม่แก้ไขต้นฉบับ |
| `js/provinces.js` | **ใหม่ 0.4** โมเดลและชั้นกรอบจังหวัด (fill < z9, outline < z12, selected < z13), `buildProvinceModel`, `provinceBounds` | นับจากแถวที่ไม่ใช้ตัวกรองจังหวัด; measured_zero/out_of_scope ตาม EVID-05; ไม่ใช่ขอบเขตการปกครองที่ยืนยัน |
| `js/massing.js` | **ใหม่** มวลอาคารสองชั้น: CITY (native, quiet) + FOCUS (decode tile → offset + fillet → extrude); ซ่อน twin ของอาคารที่ตั้ง | display-only; ความสูงจาก tile; ไม่ encode เมตริก |
| `js/mvt.js` | **ใหม่** MVT reader + tile maths | ไม่มี dependency; parse หลาย layer ได้ (`r.pos = end`) |
| `js/geometry.js` | **ใหม่** cleanRing, clipRingToBox, offsetRing, roundRing (enclosing cap), pointInRing, ringsIntersect | รูปโค้งต้องล้อมต้นฉบับเสมอ |
| `js/camera.js` | presets `plan/city/model/eye`, `fitPitched` (vertex-based, จุดที่มีความสูงผ่าน `projectPoint`, `apply:false` คำนวณอย่างเดียว), `applyPreset`, `shiftPadding` | ไม่ขยับข้อมูล; FOV แคบคือ axonometric; padding shift คือ 2-point; ระดับสถานที่ fit ทั้งอาคารรวมหลังคา |
| `js/breadcrumb.js` | **ใหม่** crumbs ประเทศไทย › จังหวัด › ย่าน, `document.title` | ไม่สร้าง Locale/municipality id |
| `js/charts.js` | ranking / fixed-layout matrix / compare เป็น HTML+SVG | ทุก mark เป็น `<button>`; matrix ช่องเท่ากัน + caption |
| `js/panel.js` | HTML ของแผงทุกโหมด (focus mode cue, ดูทุกย่าน, รายการจังหวัด), ชิปตัวกรอง, `metricTile`/`heading` พร้อม pictogram | pure strings; ปุ่มทุกตัวมี `data-action` (+ `select-province`) |
| `js/vendors.js` | loader ของ MapLibre JS/CSS พร้อม timeout/retry | — |
| `js/brand-logos.js` | approved identity, aliases, safe local sprite | ไม่ fuzzy-match |
| `js/navigation.js` | approved icons, `PICTOGRAM_CONTRACT`, toolbar titles, help dialog | visible labels, Escape, focus return; pictogram แสดงเมื่อฟอนต์โหลด (`pictograms-ready`) |
| `styles.css`, `logos.css`, `navigation.css`, `assets/theme.css` | layout/panel/map chrome/charts/crumbs/toolbar, logo vars, icons/help, LDS tokens + **basemap tokens** | token-only colours |
| `scripts/build-handoff.mjs`, `scripts/verify-live.mjs` | manifest + ZIP, live byte attestation | hash จาก bytes จริง; ตรวจ live ก่อนอ้างว่าเผยแพร่ |
| `js/venue-logos.js` | **ใหม่ 0.5** ทะเบียนโลโก้สถานที่: ตรวจ record, ค้นด้วย center id / ชื่อตรงตัว, markup กล่องพื้นรอง + บทบาท | ไม่ fuzzy; ชื่อสถานที่ยังเป็นตัวตน; ทะเบียนหายแค่ไม่มีกล่อง |
| `scripts/build-venue-logos.py` | สร้าง `data/venue-logos.json`, `assets/venue-logos/`, `assets/venue-logos-manifest.json` จาก manifest ของชีต | ตรวจ sha256 ก่อนคัดลอก; วิเคราะห์พื้นรองจากงานศิลป์ |
| `scripts/extract-provinces.mjs`, `scripts/build-pictogram-font.py` | สร้าง `data/provinces.geojson` (จาก OpenGISData-Thailand) และฟอนต์ pictogram 8 glyph (จาก Material Symbols Rounded) | บันทึก provenance (commit, sha256, วันที่) ใน metadata/manifest |

## แผนงานและสถานะ

| ID | งานและผลลัพธ์ | สถานะ | หลักฐาน |
|---|---|---|---|
| P01–P08 | รุ่น 0.2: snapshot/contracts, row scopes + Aha, กราฟ, choropleth/focus-quiet, แผง, resilience, verification, release | done (P06 retained) | `handoff-manifest.json`, `VERIFICATION.md`, receipt ของ 0.2 |
| P09 | Product Statement เป็น winning strategy (Who/What/Which/How + quality bar + hypotheses) และ `product-statement.json` + schema 1.2.0 | done | ajv 2020-12 validate ผ่าน |
| P10 | basemap กระดาษที่สร้างเองบน OpenFreeMap + `--basemap-*` tokens สองธีม + sky/fog/light | done | `tests/map-style.test.js`; harness screenshots |
| P11 | มวลอาคารสองชั้น: quiet city tier, focus tier มุมโค้งที่ล้อมต้นฉบับ, ซ่อน twin ของอาคารที่ตั้ง | done | `tests/massing.test.js`, `tests/mvt.test.js`, `tests/geometry.test.js`, fixture `tests/fixtures/mvt-sample.pbf` |
| P12 | กล้อง presets, `fitPitched` แบบ vertex, ปุ่ม 3D, มุมสถาปนิกเป็นกล้องระดับสถานที่ (ค่าเริ่มต้น) พร้อมฉาก quiet/มองทะลุ (`SCENE.eye`, occluder layer), URL `view3d`/`cam` | done | `tests/map-style.test.js` (presets), `tests/massing.test.js` (scene/occlusion); harness |
| P13 | 3D-first auto focus (top-3) + ดูทุกย่าน + cue ในแผง | done | harness desktop/mobile ทั้งสองธีม |
| P14 | Breadcrumb 4 ระดับ (ประเทศไทย › จังหวัด › ย่าน › สถานที่) + `PROVINCES` + `provinceCode` ใน GeoJSON + Shopping Center id เป็น id สถานที่ + URL `province=CODE` | done | `tests/map-style.test.js` (breadcrumb/provinces/venue rules), `tests/neighborhoods.test.js` |
| P15 | Matrix ช่องเท่ากัน (`table-layout: fixed`, `<colgroup>`) + caption | done | rendered check |
| P16 | ตรวจ 0.3, release, live attestation, bundle | done | `VERIFICATION.md` (0.3), receipt 0.3.1 |
| P17 | อาคารของสถานที่มองเห็นเสมอ: ติดตั้ง host ก่อนมวลอาคาร + venue x-ray + กล้อง fit ทั้งอาคาร | done | `tests/venue-xray.test.js` (geometry, scissored clear, draw-order contract); harness `dbg-xray-*`; live |
| P18 | กรอบจังหวัด + drill-down (ข้อมูล ชั้น ป้าย legend รายการในแผง) | done | `tests/provinces.test.js`; harness `dbg-country/region/phuket`; live |
| P19 | Pictogram บน metric tiles / หัวข้อ / ป้ายจังหวัด (ข้อยกเว้นทดลอง) | done | `tests/provinces.test.js` (contract ↔ manifest ↔ CSS); harness |
| P21 | โลโก้สถานที่จากชีต research: ทะเบียน ไฟล์ตรวจแล้ว ตำแหน่งในแผง | done | `tests/venue-logos.test.js` (validation, lookup, markup, ทุกไฟล์ตรง sha256); live |
| P22 | ตรวจ 0.5, release, live attestation, bundle | in progress | `VERIFICATION.md` (0.5), `RELEASE_RECEIPT.json` ใน bundle |
| P20 | ตรวจ 0.4, release, live attestation, bundle | done | `VERIFICATION.md` (0.4: unit 92, harness, live 778a32a + 8b2e01b), `RELEASE_RECEIPT.json` ใน bundle |

## งานถัดไปที่แนะนำ (backlog สำหรับ vibe coding)

| ID | งาน | ขอบเขต/เกณฑ์ |
|---|---|---|
| N01 | Playwright regression ใน CI: โหลดหน้า, 3D first Aha, ดูทุกย่าน, เลือกย่าน/ร้าน, ธีม, 390/1280, fault-injection | ใช้ harness แบบเดียวกับใน VERIFICATION (stub tiles + vendored MapLibre) |
| N02 | ป้ายย่านเป็น symbol layer ของ MapLibre แทน HTML overlay | คงชื่อ + ตัวนับ + กดได้ + quiet state |
| N03 | เปรียบเทียบสองย่านเคียงกัน | สองโปรไฟล์บน `scopeRows` เดียวกัน; ไม่บวกค่าข้ามย่าน |
| N04 | ขอบเขตย่านนอกกรุงเทพฯ ตาม NEIGHBORHOOD_METHOD | polygon คงที่ + หลักฐานชื่อ |
| N05 | รอบอัปเดตข้อมูล: owner, cadence, closure review | data owner |
| N06 | Native `file:` entry และ fault-injection ใน Chrome/Safari จริง | AC02/AC03/AC05 |
| N07 | ลงทะเบียน 10 ย่านเป็น Locale ของ CityMETER เพื่อให้ breadcrumb ใช้ `/L/{locale uuid}/V/{center id}` แทน `/N/…/V/` ที่เสนอ และยืนยัน route ระดับสถานที่ของ production | ต้องการการตัดสินใจของ platform + data owner |
| N08 | งบประมาณประสิทธิภาพ 3D บนมือถือ: decode tile บน worker, ลดจำนวน tile ของ focus tier, กล้องตาม reduced-motion | frontend |
| N09 | ตรวจความครอบคลุมความสูงอาคาร OSM ในย่านโฟกัส (ค่า default เมื่อไม่มี tag) และบันทึกรายย่าน | data/field |
| N10 | ทดสอบสมมติฐาน Who/What/Which/How กับผู้ใช้สามกลุ่ม (statement §7) | product owner |
| N11 | รายงาน defect ขอบฟ้าของ MapLibre ต้นน้ำพร้อม repro และแยกให้ชัดจากพฤติกรรม depth ของชั้นโปร่งใสที่แก้แล้วใน 0.4 | frontend |
| N12 | ลงทะเบียนชุด pictogram 8 glyph (บทบาท สี) ใน LDS เมื่อเจ้าของอนุมัติผลทดลอง แล้วยกเลิกข้อยกเว้น | design system owner |
| N13 | แทนกรอบจังหวัดจาก OpenGISData-Thailand ด้วยขอบเขตจังหวัดของ CityMETER production (แหล่งเดียวกับ `/v3/citymeter/{code}`) และต่อการกดกรอบเข้ากับ route ของ production | platform + data owner |
| N14 | ขยาย x-ray ไปยังอาคารของร้านที่เลือกในระดับย่าน และ flow sheet บนมือถือ; วัดประสิทธิภาพ scissored clear บน GPU ต่ำ | frontend |
| N15 | โลโก้สถานที่บนแผนที่ (ชิปที่จุดสถานที่ในโฟกัส zoom 13.5–16 จัดการชนกัน) และหาโลโก้ The Mall Ramkhamhaeng ที่ยังขาด | frontend + data owner |

## เกณฑ์รับงาน

| ID | สถานการณ์ | ผลที่ต้องเห็น |
|---|---|---|
| AC01 | เปิดผ่าน HTTP/HTTPS | ข้อมูลและแผงพร้อมก่อน map; launch overlay ปิดเมื่อ `citymeter:ready` |
| AC02 | เปิด `index.html` ผ่าน `file:` | เห็นลิงก์สาธารณะและไปยัง `https://montri-th.github.io/luxurybrands/` โดยเก็บ query/hash |
| AC03 | core data ล้มเหลว | ข้อความสั้น ลิงก์ ลองใหม่; ไม่มี shell ว่าง |
| AC04 | optional GeoJSON/catalog ผิดรูป | counts/filter/table ใช้ได้; invalid geometry ไม่เข้าการคำนวณ |
| AC05 | MapLibre timeout แล้วลองใหม่ | ข้อมูล ตาราง กราฟยังอยู่; ปุ่ม retry ใช้ได้; ไม่มี script ซ้อน |
| AC06 | เปลี่ยนตัวกรอง เลือกย่าน focus auto/explicit/none ล้าง | pins/counters/table ใช้ `rows`; Aha/choropleth/charts ใช้ `scopeRows` พร้อมคำอธิบายขอบเขต; URL คืนสถานะได้ |
| AC07 | สาขาหลาย ID พิกัดเดียวกัน | ทุก ID มีหมุด; slot ใกล้ anchor; พิกัดไม่เปลี่ยน |
| AC08 | โลโก้หนาแน่น | ≤ 250, ต่างแบรนด์ก่อน, ไม่ทับ UI, ไม่มีโลโก้ต่ำกว่า zoom 14 หรือบน context pins |
| AC09 | desktop/mobile, light/dark | header 48 px; แผง/sheet ตามสัญญา; popup อ่านได้; ไม่มี horizontal overflow ที่ 390 px; basemap ที่สร้างเองทั้งสองธีม |
| AC10 | คีย์บอร์ด/reduced motion | focus เห็นชัด; หมุด กราฟ แผง toolbar help ใช้คีย์บอร์ดได้; context pins ไม่อยู่ใน tab order |
| AC11 | ข้อความ dynamic | ไม่มี caveat/research/CSV; สถานะปิด วันที่ แหล่งข้อมูล หน่วยนับถูกต้อง; missing ไม่แสดงเป็น 0 |
| AC12 | release/handoff | commit, live bytes, manifest hashes, bundle ตรงกัน; ไม่มี private URL/secrets |
| AC13 | focus + quiet | ย่านนอก focus เป็นเส้นขอบบาง ป้ายจาง รายการนอก focus เป็นจุดสีเทาไม่มีโลโก้ มวลอาคารเมืองโทนเงียบ |
| AC14 | choropleth | ระดับสีตรง legend และกราฟอันดับ; measured zero มีเส้นขอบศูนย์; fill หายที่ zoom ≥ 14.5; HEX เดียวกันสองธีม |
| AC15 | 3D first Aha | ภาพแรกหลังข้อมูล+แผนที่พร้อมคือ preset `city` (pitch 56, bearing 28) ที่เห็นทุกจุดยอดของ 3 ย่านอันดับต้น; แผงมี Aha + cue 3D + ดูทุกย่าน; `?areas=all` และปุ่ม 3D ออกจากสถานะนี้ได้โดยตัวเลขไม่เปลี่ยน |
| AC16 | basemap ที่สร้างเอง | style มาจาก `buildMapStyle` และ `--basemap-*` เท่านั้น; data fill ก่อน `waterway`; massing ก่อน `water-name`; ป้าย `name:th` ก่อน; ไม่มี POI/เลขที่บ้าน/เขตปกครอง; เปลี่ยนธีมแล้ว style ถูกสร้างใหม่และชั้น spatial ติดตั้งใหม่ |
| AC17 | มวลอาคารโฟกัสมุมโค้ง | offset ออกแล้วลบมุมจนทุกจุดยอดต้นฉบับอยู่ภายใน; ไม่มี z-fighting กับ twin; อาคารที่ซ้อนอาคารที่ตั้งถูกตัดจาก focus และซ่อนใน city tier; ความสูง `render_height + 0.35 m` |
| AC18 | กล้อง | `model` FOV 14 เส้นตั้งตั้งตรงในย่าน; ระดับสถานที่ใช้มุมสถาปนิก (pitch 75 / FOV 24) เป็นค่าเริ่มต้น จัดกรอบพอดีอาคารของสถานที่; ปุ่มสลับเป็น model และเขียน `?cam=model`; ปุ่มปิดใช้ในภาพรวม/ย่านและใน 2D; `plan` pitch 0 เมื่อปิด 3D |
| AC19 | breadcrumb | ประเทศไทย › จังหวัด › ย่าน › สถานที่ อยู่บนสุดของแผง; `province` ใน URL = รหัส production; crumb สถานที่ถือ Shopping Center id; สถานที่นอกย่านข้ามระดับย่าน; ร้านเป็นหัวเรื่องไม่ใช่ crumb; จอแคบพับ 4 ระดับเป็น “…”; crumb actions ล้างระดับที่ถูกต้อง; `document.title` ตรง crumbs |
| AC20 | matrix | ทุกช่องกว้าง/สูงเท่ากันไม่ว่าค่าใด; caption บอกว่าขนาดไม่มีความหมาย; legend สีใช้ count classes |
| AC21 | product statement | MD + JSON มี Who/What/Which/How, quality bar, ป้ายหลักฐาน, hypotheses; JSON ผ่าน schema 1.2.0 |
| AC24 | อาคารของสถานที่มองเห็นเสมอ | ที่ระดับสถานที่ใน 3D เห็นรูปทรงสีน้ำเงินของสถานที่จากทุก bearing, pitch (≤ 75) และ zoom ≥ 13 แม้มีอาคารสูงกว่าคั่นระหว่างกล้องกับสถานที่; กดที่รูปทรงได้ทุกจุด รวมผนังตึกสูงที่ hit-test ของ MapLibre ไม่เจอ (จากระดับร้าน → เปิดสถานที่; เคอร์เซอร์ pointer); ลำดับชั้น city/focus/occluder → host extrusion → venue-xray → water-name; ใน 2D ยังเห็น footprint |
| AC25 | มุมมองทั้งประเทศ | zoom < 9 จังหวัดที่มีแบรนด์มีกรอบระบายสีพร้อม legend “จังหวัด · จำนวนแบรนด์” และป้ายชิป; กดกรอบ/ป้าย/รายการในแผงแล้วได้ตัวกรองจังหวัด breadcrumb และกล้อง; zoom ≥ 9 กรอบเหลือเส้นและ legend กลับเป็นย่าน; เลือกจังหวัดแล้วกรอบอื่น quiet |
| AC26 | Pictogram | metric tiles หัวข้อ และป้ายจังหวัดแสดง pictogram 8 แบบเมื่อฟอนต์โหลดแล้วเท่านั้น (`pictograms-ready`); ไม่มีฟอนต์ ข้อความอ่านได้เหมือนเดิม; nav-7 bytes ไม่เปลี่ยน |
| AC27 | โลโก้สถานที่ | สถานที่ที่มีลิงก์ในทะเบียนแสดงโลโก้ที่หัวแผง (พร้อมคำบอกบทบาทเมื่อเป็นโลโก้โครงการแม่/เครือ) แถวรายการสถานที่ และช่องสถานที่ของร้าน; ไม่มีลิงก์ = ไม่มีกล่อง; ทุกไฟล์ตรง sha256 ของทะเบียน; ไม่มีลิงก์ Drive; ชื่อสถานที่ไม่เปลี่ยน |
| AC22 | โฟกัสระดับสถานที่ + ฉากมองทะลุ | เปิดสถานที่ (หรือร้านในสถานที่) แล้วเฉพาะอาคารของสถานที่นั้นเป็นสีน้ำเงิน เฉพาะแถวของสถานที่มีหมุดสีประเภท/โลโก้ แถวอื่นเป็นจุดเทา; มวลอาคารเมือง opacity 0.16 (ปกติ 0.22 + จางตามระยะ) ชั้นโฟกัส 0.62; อาคารที่ยืนระหว่างกล้องกับสถานที่วาดที่ 0.14; ออกจากระดับสถานที่แล้วคืนค่าทั้งหมด |

## วิธีพัฒนาและทดสอบ

```sh
npm start        # http://127.0.0.1:4173/
npm test         # 96 unit tests บนข้อมูลจริงและ fixture tile
npm run handoff:manifest   # เขียน handoff/handoff-manifest.json จาก bytes จริง
npm run handoff:bundle     # + dist/CityMETER-Luxury-Brands-Developer-Handoff.zip
npm run verify:live        # เทียบ SHA-256 ของไฟล์บน GitHub Pages กับ manifest
```

ตรวจ browser ที่ 390 px และ 1280 px ทั้งสองธีม: 3D first Aha, ดูทุกย่าน, ดูทั้งหมด (กรอบจังหวัด + legend จังหวัด + ป้าย), เจาะลงจังหวัด, โปรไฟล์ย่าน (model preset), สถานที่ (มุมสถาปนิก, อาคารของสถานที่เท่านั้นสีน้ำเงินและมองเห็นเสมอ — หมุน/เอียง/ซูมแล้วยังเห็นและกดได้, อาคารที่บังโปร่งใส), ร้าน, ปุ่มมุมสถาปนิก → model, ปุ่ม 3D → plan, breadcrumb 4 ระดับ (และ “…” บนจอแคบ), กราฟสามมุมมอง (matrix ช่องเท่ากัน), ตาราง, help, no results, permalink ถ้า CDN/tiles ถูกบล็อกในเครื่องทดสอบ ให้ vendored MapLibre จาก npm, stub TileJSON และ tile สังเคราะห์ตาม OpenMapTiles schema ผ่าน request interception (วิธีที่ใช้ใน VERIFICATION) แล้วยืนยันรูปลักษณ์จาก tile จริงบน live อีกครั้ง การอ่าน source ไม่เท่ากับทดสอบ browser จริง

จูนกล้อง/มวลอาคารสดได้จาก console: `__citymeter.applyPreset('eye')`, `__citymeter.fitMap()`, `__citymeter.state.massingResult` ก่อนแก้ค่าคงที่ใน `js/camera.js` / `js/massing.js`

## Release บน GitHub Pages

Repository `https://github.com/montri-th/luxurybrands` · branch `main` · Pages ใช้ branch deploy (ไม่มี workflow ใน repo) · Live `https://montri-th.github.io/luxurybrands/`

ขั้นตอน: `npm test` → bump `?v=` ใน `index.html` และ `version` ใน `package.json` → commit → `git push origin main` → รอ run `pages-build-deployment` สำเร็จ → `npm run handoff:manifest` บน commit ที่ push → `npm run verify:live` ต้องผ่านทุกไฟล์ → `npm run handoff:bundle` พร้อม `--receipt` และ `--evidence` ห้ามรายงานว่าเผยแพร่แล้วจากผลในเครื่อง cache ของ Pages อยู่ที่ 10 นาที จึงใช้ `?v=<release>` บน entry files และ `cache: 'no-store'` ใน verify

คง attribution ของ OpenFreeMap/OpenMapTiles/OpenStreetMap ไม่รวม governed LDS package หรือ raw internal sources ลง repository
