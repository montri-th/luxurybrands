# CityMETER Luxury Brands — Implementation Plan

รุ่นส่งต่อ 0.1 · ปรับเอกสาร 22 ตุลาคม 2569 · ข้อมูลตรวจถึง 21 ตุลาคม 2569 · ใช้คู่กับ [PRODUCT_BRIEF.md](PRODUCT_BRIEF.md) และ [implementation-plan.json](implementation-plan.json)

เป้าหมายรอบนี้คือเปลี่ยนลำดับการอ่านให้เริ่มจากย่าน รักษาแผนที่รายจุดขายและประสบการณ์ปัจจุบัน แล้วส่งมอบทั้ง source, machine contracts และหลักฐานทดสอบที่ทีมทำต่อได้

## สถาปัตยกรรมที่มีจริง

เป็น static HTML/CSS และ JavaScript ES modules ไม่มี build step หรือ framework ภายในโปรเจกต์ ใช้ `npm start` เสิร์ฟผ่าน Python และ `npm test` เรียก Node test runner ไลบรารีแผนที่/กราฟโหลดจาก URL รุ่นที่กำหนดใน `js/vendors.js`

| ไฟล์ | หน้าที่ | ข้อต่อที่ต้องรักษา |
|---|---|---|
| `index.html` | โครงหน้าจอ ปุ่ม ตัวกรอง คู่มือ และ launch fallback | DOM IDs ที่ `app.js` ใช้; ไม่มี CSV/caveat UI |
| `js/launch.js` | classic boot script, file bridge, loading/error fallback | `citymeter:ready`, `citymeter:load-error`; fixed public origin |
| `js/app.js` | committed selection, orchestration, รายละเอียด, URL state | แผนที่ ตัวเลข กราฟ และตารางใช้ selection เดียวกัน |
| `js/model.js` | taxonomy, status filters, counts และ point features | ไม่แก้แถวต้นทาง; POS และ distinct brands แยกกัน |
| `js/neighborhoods.js` | point-in-polygon, membership และสรุปย่าน | boundary คงที่; shared edge ใช้ priority แล้ว stable ID |
| `js/area-insight.js` | Top 3 ย่าน, union ของแบรนด์ และ area-focus filter | ใช้ filtered base ก่อน area focus; ไม่บวก distinct brands ข้ามย่าน |
| `js/chart-model.js` | โมเดลอันดับย่าน, bubble mix และ exclusive/shared | distinct brands; อ้างทุก assigned areas ก่อนตัด Top-N; มี fixtures |
| `js/pins.js` | หมุดรายจุดขาย ตำแหน่งบนจอ โลโก้ และ keyboard picking | source coordinate ไม่เปลี่ยน; โลโก้ชนกันไม่ทำให้จุดขายหาย |
| `js/buildings.js` | รูปทรงอาคาร/parts และ coverage | source IDs/height metadata เดิม; ไม่สร้าง footprint จากวงรัศมี |
| `js/charts.js` | amCharts adapters และ chart selection callbacks | ใช้ข้อมูลจริงที่ผ่านตัวกรอง ไม่มี demo observations |
| `js/vendors.js` | MapLibre GL 5.6.2 / amCharts 5.20.8 | โหลดพร้อมกันซ้ำไม่เพิ่ม scripts; timeout/failure ลองใหม่ได้ |
| `js/brand-logos.js` | approved identity, aliases, safe local sprite | ไม่ fuzzy-match จนย้ายแบรนด์; image bytes/สีเดิม |
| `js/navigation.js` | approved icons และ accessible help dialog | visible labels, Escape, focus return, font fallback |
| `styles.css`, `logos.css`, `navigation.css`, `assets/theme.css` | layout, typography, theme และการแสดงแบรนด์ | header/sidebar dimensions; scoped popup overrides ทน lazy vendor CSS |

## แผนงานเป็นช่วง

| ID | งานและผลลัพธ์ | ขึ้นกับ | เกณฑ์ส่งงาน |
|---|---|---|---|
| P01 | ตรวจ commit/data/assets และสรุป source identity ใน machine files | ไม่มี | snapshot, grain, filters, fields และ hashes อ้างไฟล์จริง; ไม่มี private URL/credentials |
| P02 | ตรวจและปิดงาน Aha ที่นำด้วยย่านซึ่งเชื่อมใน source แล้ว | P01 | ชื่อ/จำนวน/สัดส่วนคำนวณจริง; เลือกย่านแล้วทุกมุมมองตรงกัน; กลับไปดูทั้งหมดได้ |
| P03 | ตรวจและปิดงาน neighborhood rank/bubble mix/exclusive-shared ตาม implementation ล่าสุด | P02 และ metric contract | pure calculations มี fixtures; chart/table/map drilldown ตรงกัน; ไม่อ้างทำเสร็จก่อน browser validation |
| P04 | ตรวจหมุด โลโก้ อาคาร และป้ายย่านกับ filter ใหม่ | P02 | หนึ่ง ID ต่อหนึ่งหมุดที่แสดงได้; co-location ยังแยก; max 250 logos; category pins และ source coordinates คงเดิม |
| P05 | เก็บหน้าจอตาม LDS และคำสั่งล่าสุด | P02–P04 | ไม่มี Caveats/Research badge/CSV; popup อ่านได้ทั้งธีม; จอแคบไม่ทับกัน; icons 300 outline |
| P06 | ตรวจ data/vendor failure และ retry | P01; ทำขนาน P02–P05 ได้ | core data ใช้ได้แม้ optional data/map/chart ล้มเหลว; malformed optional geometry fallback; retry กลับมาใช้ได้ |
| P07 | รันทดสอบและตรวจ browser ทุก flow ที่เปลี่ยน | P02–P06 | automated tests ผ่าน พร้อม screenshots/เหตุการณ์ที่ตรวจจริง ระบุ browser/viewport/theme/commit |
| P08 | จัด handoff, ตรวจ manifest, อัปเดต GitHub Pages และตรวจ live | P07 | machine/human files สอดคล้องกัน; final hashes ตรงไฟล์; live release ตรง commit และไม่มี stale UI |

แต่ละช่วงให้เป็น change ที่ review ได้แยกกัน ห้ามแก้ source datasets, taxonomy หรือสูตรพื้นที่เพียงเพื่อทำให้ภาพดูดี หากจำเป็นต้องเปลี่ยนให้บันทึกเหตุผลและเพิ่ม fixture ของกรณีนั้น

## Shared state และสูตรที่เชื่อมแล้ว

1. ฐานข้อมูลเริ่มจาก cohort/status แล้วจึงใช้ search, segment, province, channel, venue และ neighborhood membership ตามที่ contract ระบุ
2. พิกัดต้นทางใช้กำหนดสมาชิกย่าน การจัดตำแหน่งหมุดหรือป้ายบนจอไม่ย้อนกลับไปเปลี่ยนสมาชิก
3. Aha ใช้ฐานเปรียบเทียบที่ประกาศไว้; การกด CTA เป็น selection แยกที่ล้างได้ ไม่เปลี่ยน denominator โดยไม่ตั้งใจ
4. Aha เลือกสูงสุด 3 ย่าน เรียง `distinct brands` ลดลง, `POS rows` ลดลง แล้ว stable ID; ตัวเศษเป็น brand union ใน 3 ย่าน ตัวหารเป็นแบรนด์ทั้งหมดใน filtered base รวมรายการนอกขอบเขต
5. Mix เป็น bubble matrix ของ distinct brands ต่อคู่ย่าน–กลุ่มแบรนด์ พื้นที่วงกลมแปรตามจำนวนแบรนด์ สีแยกกลุ่ม ห้ามใช้ขนาดเป็นคะแนนความหรู
6. Exclusive/shared เทียบทุก assigned neighborhoods ใน selected rows ก่อน display Top-N; กรณีน้อยกว่า 2 ย่านไม่แสดง all-exclusive claim ให้ action `resetAreas` กลับไปดูทุกย่าน
7. ประวัติเดิมและข้อสังเกตสถานะไม่กลายเป็นร้านใหม่เพิ่มจากการรวม cohort

นิยามนี้ตรงกับ source และ `product-brief.json` ที่ใช้ส่งต่อ P02/P03 มี implementation และผล automated/rendered spot checks แล้วตามบันทึกด้านล่าง ไม่ถือเป็นสูตรที่ยังรอเลือก การเปลี่ยนสูตรรอบถัดไปต้องแก้ consumer, machine contract และ fixtures พร้อมกัน

## เกณฑ์รับงาน

| ID | สถานการณ์ | ผลที่ต้องเห็น |
|---|---|---|
| AC01 | เปิดผ่าน HTTP/HTTPS ตามปกติ | ข้อมูลและ controls พร้อมก่อนรอ map/chart; launch overlay ปิดเมื่อ `citymeter:ready` |
| AC02 | เปิด `index.html` ผ่าน `file:` | เห็น public link และไป `https://montri-th.github.io/luxurybrands/` โดยเก็บ query/hash; ไม่มีการลด browser security |
| AC03 | required data ล้มเหลวหรือโมดูลเริ่มไม่ได้ | ข้อความสั้น ลิงก์ใช้งาน และลองใหม่; ไม่เหลือ shell ว่างหรือ spinner ไม่จบ |
| AC04 | optional GeoJSON/catalog ผิดรูปหรือโหลดไม่ได้ | core counts/filter/table ยังใช้ได้; invalid geometry ไม่เข้าการคำนวณ; diagnostics เก็บในชั้นพัฒนา ไม่เป็น caveat banner |
| AC05 | map/chart CDN timeout แล้วลองใหม่ | ข้อมูลยังอยู่; ปุ่ม retry ใช้ได้จริง; ไม่มี map/overlay/script ซ้อนจากการลองใหม่ |
| AC06 | เปลี่ยนตัวกรองเร็ว เลือก Aha แล้วล้างการเลือก | map, Aha, counts, charts และ table สะท้อน committed slice เดียวกัน ไม่มีข้อมูลชุดก่อนค้าง |
| AC07 | จุดขายหลาย ID ใช้พิกัดเดียวกัน | ทุก ID ที่อยู่ในมุมมองมีหมุดของตัวเอง ตำแหน่งบนจอ bounded ใกล้ anchor; latitude/longitude ไม่เปลี่ยน |
| AC08 | โลโก้หนาแน่นหรือจอเล็ก | โลโก้ไม่เกิน 250, ต่างแบรนด์มีลำดับก่อน, labels ไม่ชน UI; category pins/ชื่อ/keyboard ยังใช้ได้ |
| AC09 | desktop/mobile, light/dark และ lazy MapLibre CSS | header 48 px/sidebar clamp คงเดิม, popup อ่านได้, mobile portrait ไม่เปิด popup ซ้ำแผงล่าง |
| AC10 | ใช้ Tab/ลูกศร/Enter/Escape และ reduced motion | focus เห็นชัด; help กัก focus/คืน focus; เลือกหมุดและ tabs ได้; ไม่มีการเคลื่อนไหวบังคับ |
| AC11 | ตรวจข้อความทุกจุดที่สร้างแบบ dynamic | ไม่กลับมาแสดง Caveats, method disclaimer, Research demo หรือ CSV; สถานะปิด วันที่ แหล่งข้อมูล และหน่วยนับยังถูกต้อง |
| AC12 | release/handoff สุดท้าย | ไม่มี private Drive/Sheet URL หรือ secrets; data/asset hashes และ commit ตรง manifest; public URL แสดง release ที่ตรวจแล้ว |

## วิธีพัฒนาและทดสอบ

จาก root ของ repository:

```sh
npm start
```

เปิด `http://127.0.0.1:4173/` ไม่ต้อง build และไม่มี local package dependencies ที่ต้องติดตั้งเพิ่ม Runtime ต้องมี Node ที่รองรับ `node --test` และ Python 3; โปรเจกต์ยังไม่ได้ pin เวอร์ชัน runtime ใน `package.json`

```sh
npm test
```

เพิ่มหรือปรับ tests เมื่อสัญญาเปลี่ยน โดยเฉพาะ neighborhood calculations/shared selection, source-coordinate invariance, logo priority/overlap, closed/history filters และ optional/vendor recovery อย่ารักษา test เก่าที่บังคับ viewport-wide pin fan หรือขั้นต่ำ spacing รุ่นเก่าจนทำให้สัญญา compact placement ถอยกลับ

ตรวจ browser ที่ 390 px และ desktop เช่น 1280 px ทั้งสองธีม รวม portrait/landscape, ป้ายไทยยาว, เปิดตาราง/กราฟ/คู่มือ, เลือกย่านและร้าน, no results, map/chart retry และเปิดหน้าจาก permalink ตรวจ Chrome และ Safari จริงเมื่อมีเครื่องมือ พร้อมระบุสิ่งที่ไม่ได้ทดสอบ การอ่าน source หรือ VM harness ไม่เท่ากับทดสอบ browser protocol จริง

การตรวจ LDS package/hash, static artifact, automated tests, rendered browser และ live deployment เป็นหลักฐานคนละระดับ บันทึกแยกใน manifest ห้ามแปลงผลระดับหนึ่งเป็นคำรับรองทั้งระบบ

### ผลตรวจที่บันทึกในรอบส่งต่อนี้

| ระดับ | ผลที่ยืนยันแล้ว | ขอบเขต |
|---|---|---|
| Automated | Unit suite 51/51 ผ่าน | ไม่แทนผล browser หรือ live release |
| Rendered desktop | IAB 1280 px ธีมมืดแสดงกราฟย่านทั้งสาม | เลือกสยามได้ 64 POS; compare แสดงกรณีน้อยกว่า 2 ย่านและ reset action |
| Rendered mobile | Aha แสดง 3 ย่าน 175 POS / 97 แบรนด์ใน snapshot | เป็นผลที่คำนวณจากข้อมูล ไม่ใช่ข้อความ hardcode |
| LDS | Static artifact ผ่าน; package verifier ผ่าน 9,768 checks | ผล package/static แยกจากการตรวจข้อความและหน้าจอ |
| File bridge/recovery | ตรวจ source และ VM/isolated recovery scenarios | AC02 ยังไม่ผ่านการเปิด `file:` จริงใน native Chrome/Safari; ไม่อ้าง fault injection ครบทุก browser |
| Public release/bundle | บันทึกแยกโดย release owner | ตรวจ final commit/endpoint/hashes ตาม manifest และ release receipt ใน bundle |

ตาราง AC01–AC12 เป็นเกณฑ์รับงาน ไม่ใช่รายการที่ประกาศว่าผ่านครบแล้ว ให้ใช้ผลระดับ scenario ใน verification/receipt ของชุดส่งมอบเมื่อขยาย coverage ต่อ

## Release บน GitHub Pages

Repository: `https://github.com/montri-th/luxurybrands` · Live: `https://montri-th.github.io/luxurybrands/`

ตรวจ settings ของ Pages และ branch/path ที่ใช้งานจริงก่อนเปลี่ยน deployment ไม่สร้าง workflow ซ้อนโดยสมมติว่า repository ใช้ Actions ปัจจุบันส่งไฟล์ static ได้โดยไม่มี build pipeline ภายใน

ส่ง commit ที่ผ่าน P07 ตาม workflow ของ repository แล้วตรวจ endpoint จนเห็น commit/assets รุ่นเดียวกัน ทดสอบข้อมูลจาก live response, สถานะเริ่มต้น, district Aha, shared filters, light/dark popup, mobile details และ core UI เมื่อ optional vendor ใช้ไม่ได้ หากใช้ cache revision ให้ปรับ consumer ที่เกี่ยวข้องและตรวจ URL ที่ network โหลดจริง ไม่สรุปจากไฟล์ในเครื่องเพียงอย่างเดียว

คง attribution ของ OpenFreeMap/OpenMapTiles/OpenStreetMap และ amCharts ตามการใช้งาน ไม่รวมทั้ง governed LDS package หรือ raw internal sources ลง public repository เพิ่มเพื่อให้ “แพ็กเกจครบ”

## งานต่อหลังส่งมอบ

| เรื่อง | งานที่ต้องทำ | ผู้รับผิดชอบตามบทบาท |
|---|---|---|
| Browser coverage เพิ่มเติม | เพิ่ม native file-entry/fault-injection CI, keyboard และ responsive scenarios นอกเหนือจาก spot checks ที่ทำแล้ว | Frontend/QA |
| รอบอัปเดตข้อมูลและสถานะสาขา | ระบุ owner/schedule และวิธีเก็บประวัติ โดยไม่อ้าง real-time | Data owner |
| Runtime/hosting configuration | pin หรือบันทึกรุ่น Node/Python และ Pages source จริงใน manifest | Developer/release owner |
| หลักฐาน final release | ตรวจ public endpoint/commit และ hash หลังไฟล์นิ่งใน receipt ของ bundle | Release owner |

เมื่อปิดเรื่องใดแล้วให้แก้สถานะและหลักฐานใน machine files รวมทั้งข้อความ human ที่เกี่ยวข้อง เพื่อไม่ให้ทีมต้องเลือกระหว่าง brief หลายฉบับ
