# CityMETER Luxury Brands — Implementation Plan

รุ่นส่งต่อ 0.2 · ปรับเอกสาร 22 ตุลาคม 2569 · ข้อมูลตรวจถึง 21 ตุลาคม 2569 · ใช้คู่กับ [PRODUCT_BRIEF.md](PRODUCT_BRIEF.md) และ [implementation-plan.json](implementation-plan.json)

รุ่น 0.2 ส่งมอบประสบการณ์ที่นำด้วยย่านแบบ focus + quiet context, แผงอ่านข้อมูลสี่โหมด, choropleth ตาม LDS `count` และกราฟที่ไม่พึ่ง vendor พร้อม source ที่อ่านง่าย, machine contracts, สคริปต์สร้าง handoff และผลตรวจแยกระดับ เป้าหมายของแผนนี้คือให้ developer หรือ coding agent รับช่วงต่อได้โดยไม่ต้องเดาสถานะ

## สถาปัตยกรรมที่มีจริง

Static HTML/CSS และ JavaScript ES modules ไม่มี build step ไม่มี framework ไลบรารีภายนอกเพียงตัวเดียวคือ MapLibre GL 5.6.2 จาก URL ที่ pin ไว้ใน `js/vendors.js` กราฟวาดเอง `npm start` เสิร์ฟผ่าน Python, `npm test` ใช้ Node test runner (Node ≥ 20) ไม่มี `node_modules`

| ไฟล์ | หน้าที่ | ข้อต่อที่ต้องรักษา |
|---|---|---|
| `index.html` | โครงหน้าจอ: header, map panel + chrome, ถาดกราฟ, ตาราง, แผงอ่านข้อมูล, help dialog, launch overlay, web manifest | DOM IDs ที่ `app.js` และ `navigation.js` ใช้; ไม่มี CSV/caveat UI |
| `js/launch.js` | classic boot script, file bridge, loading/slow/error fallback | events `citymeter:ready`, `citymeter:load-error`; public origin คงที่ |
| `js/app.js` | state, สามขอบเขตข้อมูล (`scopeRows`/`baseRows`/`rows`), panel modes + back stack, URL state, map lifecycle, mobile sheet | ทุกมุมมองใช้ขอบเขตตามสัญญาใน brief; `update()` เป็นจุดเดียวที่คำนวณ selection |
| `js/model.js` | taxonomy, cohorts, ตัวกรองร่วม, summaries, point features | ไม่แก้แถวต้นทาง; POS กับ distinct brands แยกกัน |
| `js/neighborhoods.js` | point-in-polygon, membership, สรุปย่าน (รวม `includeEmpty`) | boundary คงที่; shared edge ใช้ priority แล้ว stable ID |
| `js/area-insight.js` | Aha 3 ย่าน และ area-focus filter | ตัวเศษ union, ตัวหารรวมนอกขอบเขต |
| `js/chart-model.js` | โมเดลอันดับ/matrix/exclusive-shared | เทียบทุก assigned areas ก่อนตัด Top-N; fixtures ใน tests |
| `js/profile-model.js` | โปรไฟล์ย่าน สถานที่ ร้าน การมีอยู่ของแบรนด์ อันดับสถานที่ ระดับความแม่นพิกัด สถานะ | pure; ใช้ `scopeRows` เป็นฐานเทียบ; ไม่ยกระดับความแม่น |
| `js/scales.js` | LDS `count` LUT 41 ค่า, class projection, equal-interval thresholds, EVID-05 states, contrast helpers | ห้าม interpolate สีใหม่; HEX เดียวกันสองธีม |
| `js/map-layers.js` | choropleth + outline + selected layers, focus/quiet, HTML labels, `buildAreaModel` | fill ใต้ชั้นถนน, maxzoom 14.5, filled/quiet properties |
| `js/pins.js` | หมุดรายจุดขาย, context pins, slot บนจอ, โลโก้, keyboard | พิกัดต้นทางไม่เปลี่ยน; context pins ไม่มีโลโก้และไม่อยู่ใน tab order |
| `js/buildings.js` | รูปทรงอาคาร/parts และ coverage | สี `map.activeLayer`; ไม่สร้าง footprint จากรัศมี |
| `js/charts.js` | ranking / numeric heat matrix / compare เป็น HTML+SVG | ทุก mark เป็น `<button>`; emit `{type:'neighborhood'}` / `{type:'resetAreas'}` |
| `js/panel.js` | HTML ของแผงทุกโหมด, ชิปตัวกรอง, status pill, link helper | pure strings; ปุ่มทุกตัวมี `data-action` |
| `js/vendors.js` | loader ของ MapLibre JS/CSS พร้อม timeout/retry | ไม่มี chart vendor อีกต่อไป |
| `js/brand-logos.js` | approved identity, aliases, safe local sprite | ไม่ fuzzy-match; bytes/สีเดิม |
| `js/navigation.js` | approved icons และ help dialog | visible labels, Escape, focus return, font fallback |
| `styles.css`, `logos.css`, `navigation.css`, `assets/theme.css` | layout/panel/map chrome/charts, logo + categorical vars, icons/help, LDS tokens | token-only colours; popup overrides ทน lazy vendor CSS |
| `scripts/build-handoff.mjs`, `scripts/verify-live.mjs` | manifest + ZIP, live byte attestation | hash จาก bytes จริง; ตรวจ live ก่อนอ้างว่าเผยแพร่ |

## แผนงานที่ทำในรุ่นนี้และสถานะ

| ID | งานและผลลัพธ์ | สถานะ | หลักฐาน |
|---|---|---|---|
| P01 | Snapshot/contracts: ตรวจ data/assets, สรุป identity ใน machine files, สคริปต์ manifest | done | `handoff-manifest.json` สร้างจาก `git ls-files` + SHA-256 |
| P02 | ขอบเขตข้อมูลสามชั้นและ Aha ย่านพร้อม fallback | done | `tests/area-insight.test.js`, `tests/profile-model.test.js` |
| P03 | กราฟสามมุมมองแบบไม่พึ่ง vendor | done | `tests/chart-model.test.js`; rendered checks (VERIFICATION) |
| P04 | Choropleth `count` + focus/quiet บนแผนที่ หมุด โลโก้ อาคาร | done | `tests/scales.test.js`, `tests/pins.test.js`; rendered checks |
| P05 | แผงอ่านข้อมูลสี่โหมด, ตัวกรองยุบ, ชิป, มือถือ bottom sheet | done | rendered checks 1280/390 ทั้งสองธีม |
| P06 | Resilience: data/vendor failure, retry, launch states | retained from 0.1; source-checked | ยังไม่ได้ fault-injection ใน native browser |
| P07 | Verification: unit 62/62, local rendered harness, live Chrome spot checks | done (scoped) | `VERIFICATION.md` |
| P08 | Release + bundle: push `main` → Pages, live attestation, ZIP + receipt | done | `RELEASE_RECEIPT.json`, `evidence/live-attestation.json` ใน bundle |

## งานถัดไปที่แนะนำ (backlog สำหรับ vibe coding)

| ID | งาน | ขอบเขต/เกณฑ์ |
|---|---|---|
| N01 | Playwright regression ใน CI: โหลดหน้า, Aha, เลือกย่าน/ร้าน, ธีม, 390/1280, fault-injection ของ map vendor | ใช้ harness แบบเดียวกับที่บันทึกใน VERIFICATION (stub tiles + vendored MapLibre) |
| N02 | ป้ายย่านบนแผนที่เป็น symbol layer ของ MapLibre (collision ในเครื่อง) แทน HTML overlay | ต้องคงชื่อ + ตัวนับ + กดได้ + quiet state |
| N03 | เปรียบเทียบสองย่านเคียงกัน (`compare` ระดับโปรไฟล์) | ใช้ `buildNeighborhoodProfile` สองชุดบน `scopeRows` เดียวกัน; ไม่บวกค่าข้ามย่าน |
| N04 | เพิ่มขอบเขตย่านนอกกรุงเทพฯ (ภูเก็ต พัทยา เชียงใหม่) ตามวิธีใน NEIGHBORHOOD_METHOD | polygon คงที่ + หลักฐานชื่อ; ห้ามขยับขอบเพื่อให้ร้านเข้า |
| N05 | รอบอัปเดตข้อมูล: owner, cadence, closure review; เก็บประวัติโดยไม่อ้าง real-time | data owner |
| N06 | Native `file:` entry และ fault-injection ใน Chrome/Safari จริง | AC02/AC03/AC05 |

## เกณฑ์รับงาน

| ID | สถานการณ์ | ผลที่ต้องเห็น |
|---|---|---|
| AC01 | เปิดผ่าน HTTP/HTTPS | ข้อมูลและแผงพร้อมก่อน map; launch overlay ปิดเมื่อ `citymeter:ready` |
| AC02 | เปิด `index.html` ผ่าน `file:` | เห็นลิงก์สาธารณะและไปยัง `https://montri-th.github.io/luxurybrands/` โดยเก็บ query/hash |
| AC03 | core data ล้มเหลว | ข้อความสั้น ลิงก์ ลองใหม่; ไม่มี shell ว่าง |
| AC04 | optional GeoJSON/catalog ผิดรูป | counts/filter/table ใช้ได้; invalid geometry ไม่เข้าการคำนวณ |
| AC05 | MapLibre timeout แล้วลองใหม่ | ข้อมูล ตาราง กราฟยังอยู่; ปุ่ม retry ใช้ได้; ไม่มี script ซ้อน |
| AC06 | เปลี่ยนตัวกรอง เลือกย่าน สำรวจ 3 ย่าน ล้าง | pins/counters/table ใช้ `rows`; Aha/choropleth/charts ใช้ `scopeRows` พร้อมคำอธิบายขอบเขต; URL คืนสถานะได้ |
| AC07 | จุดขายหลาย ID พิกัดเดียวกัน | ทุก ID มีหมุด; slot ใกล้ anchor; พิกัดไม่เปลี่ยน |
| AC08 | โลโก้หนาแน่น | ≤ 250, ต่างแบรนด์ก่อน, ไม่ทับ UI, ไม่มีโลโก้ต่ำกว่า zoom 13.5 หรือบน context pins |
| AC09 | desktop/mobile, light/dark | header 48 px; แผง/sheet ตามสัญญา; popup อ่านได้; ไม่มี horizontal overflow ที่ 390 px |
| AC10 | คีย์บอร์ด/reduced motion | focus เห็นชัด; หมุด กราฟ แผง help ใช้คีย์บอร์ดได้; context pins ไม่อยู่ใน tab order |
| AC11 | ข้อความ dynamic | ไม่มี caveat/research/CSV; สถานะปิด วันที่ แหล่งข้อมูล หน่วยนับถูกต้อง; missing ไม่แสดงเป็น 0 |
| AC12 | release/handoff | commit, live bytes, manifest hashes, bundle ตรงกัน; ไม่มี private URL/secrets |
| AC13 | focus + quiet | เมื่อเลือกย่าน/สำรวจ 3 ย่าน ย่านอื่นเป็นเส้นขอบบาง ป้ายจาง รายการนอก focus เป็นจุดสีเทาไม่มีโลโก้ |
| AC14 | choropleth | ระดับสีตรง legend และตรงกับแท่งในกราฟอันดับ; measured zero มีเส้นขอบศูนย์; fill หายที่ zoom ≥ 14.5; HEX เดียวกันสองธีม |

## วิธีพัฒนาและทดสอบ

```sh
npm start        # http://127.0.0.1:4173/
npm test         # 62 unit tests บนข้อมูลจริง
npm run handoff:manifest   # เขียน handoff/handoff-manifest.json จาก bytes จริง
npm run handoff:bundle     # + dist/CityMETER-Luxury-Brands-Developer-Handoff.zip
npm run verify:live        # เทียบ SHA-256 ของไฟล์บน GitHub Pages กับ manifest
```

ตรวจ browser ที่ 390 px และ 1280 px ทั้งสองธีม: ภาพรวม, สำรวจ 3 ย่าน, โปรไฟล์ย่าน, สถานที่, ร้าน, กราฟสามมุมมอง, ตาราง, help, no results, permalink ถ้า CDN/tiles ถูกบล็อกในเครื่องทดสอบ ให้ vendored MapLibre จาก npm และ stub style JSON ผ่าน request interception (วิธีที่ใช้ใน VERIFICATION) การอ่าน source ไม่เท่ากับทดสอบ browser จริง

## Release บน GitHub Pages

Repository `https://github.com/montri-th/luxurybrands` · branch `main` · Pages ใช้ branch deploy (ไม่มี workflow ใน repo) · Live `https://montri-th.github.io/luxurybrands/`

ขั้นตอน: `npm test` → commit → `git push origin main` → รอ run `pages-build-deployment` สำเร็จ → `npm run handoff:manifest` บน commit ที่ push → `npm run verify:live` ต้องผ่านทุกไฟล์ → `npm run handoff:bundle` พร้อม `--receipt` และ `--evidence` ห้ามรายงานว่าเผยแพร่แล้วจากผลในเครื่อง cache ของ Pages อยู่ที่ 10 นาที จึงใช้ `?v=<release>` บน entry files และ `cache: 'no-store'` ใน verify

คง attribution ของ OpenFreeMap/OpenMapTiles/OpenStreetMap ไม่รวม governed LDS package หรือ raw internal sources ลง repository
