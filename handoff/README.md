# เริ่มงานต่อ — CityMETER Luxury Brands

รุ่นส่งต่อ 0.4 · ปรับล่าสุด 22 ตุลาคม 2569 · ข้อมูลตรวจถึง 21 ตุลาคม 2569

ชุดนี้ส่งต่อให้ developer หรือ coding agent พัฒนาต่อจาก repository ที่ใช้งานจริง หลักของรุ่นนี้คือ **เห็นเมือง 3 มิติที่โฟกัส 3 ย่านอันดับต้นก่อน แสดงรายละเอียดเฉพาะส่วนที่ focus ส่วนอื่นให้เงียบ** บน basemap กระดาษที่สร้างเอง และทำให้ Product Statement เป็น winning strategy ที่ทุกส่วนของผลิตภัณฑ์ต้องรับใช้

Live: [Luxury Brands](https://montri-th.github.io/luxurybrands/) · Source: [GitHub](https://github.com/montri-th/luxurybrands)

## อ่านตามลำดับนี้

| คนอ่าน | เครื่องอ่าน | ใช้ทำอะไร |
|---|---|---|
| [../PRODUCT_STATEMENT.md](../PRODUCT_STATEMENT.md) | [product-statement.json](product-statement.json) | Winning strategy: Who / What / Which / How, quality bar, ป้ายหลักฐาน, hypotheses — อ่านก่อนเปลี่ยนสิ่งที่หน้าแรกบอก |
| [PRODUCT_BRIEF.md](PRODUCT_BRIEF.md) | [product-brief.json](product-brief.json) | เป้าหมาย ผู้ใช้ ขอบเขตข้อมูลสามชั้น + focus modes, 3D first Aha, สัญญาแผนที่ focus/quiet, basemap, massing, camera, breadcrumb, venue x-ray, กรอบจังหวัด, pictogram, แผงสี่โหมด, กราฟ, invariants INV01–INV24 |
| [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) | [implementation-plan.json](implementation-plan.json) | โมดูลและข้อต่อ (รวมโมดูลใหม่ map-style / massing / mvt / geometry / camera / breadcrumb), งาน P01–P16, backlog N01–N10, acceptance AC01–AC21, วิธีทดสอบและ release |
| [VERIFICATION.md](VERIFICATION.md) | [handoff-manifest.json](handoff-manifest.json) | ผลตรวจแยกระดับ (unit / rendered / live) และ hash ของทุกไฟล์ |
| README นี้ | [handoff.schema.json](handoff.schema.json) | สัญญาโครงสร้างของ JSON ทั้งสี่ (schema 1.2.0) |

`product-statement.json`, `product-brief.json` และ `implementation-plan.json` เขียนด้วยมือและต้องแก้คู่กับ Markdown ส่วน `handoff-manifest.json` สร้างด้วย `npm run handoff:manifest` เท่านั้นและไม่ถูก track ใน git (อยู่ใน bundle ที่ `source/handoff/handoff-manifest.json`) ห้ามแก้ hash ด้วยมือ

ใช้ [PRODUCT_STATEMENT.md](../PRODUCT_STATEMENT.md), [DATA_METHOD.md](../DATA_METHOD.md), [NEIGHBORHOOD_METHOD.md](../docs/NEIGHBORHOOD_METHOD.md) และ [CHART_SELECTION.md](../docs/CHART_SELECTION.md) เป็นบริบทผลิตภัณฑ์และข้อมูล

## เปิดในเครื่อง

```sh
npm start      # http://127.0.0.1:4173/
npm test       # 92 unit tests บนข้อมูลจริงและ fixture tile
```

เป็น static site ไม่มี build step ไม่ต้อง `npm install` ต้องมี Node ≥ 20 และ Python 3 แผนที่ต้องเข้าถึง unpkg.com (MapLibre) และ tiles.openfreemap.org (tiles + glyphs; basemap สร้างเองใน `js/map-style.js`) ส่วนกราฟไม่ใช้ไลบรารีภายนอก ถ้าเครื่องทดสอบถูกบล็อก ใช้ harness แบบ stub tiles ใน VERIFICATION การเปิด `index.html` เป็นไฟล์โดยตรงจะนำไปเว็บสาธารณะ

## สิ่งที่ห้ามทำหล่น

- ขอบเขตข้อมูลสามชั้น: `rows` ขับหมุด ตัวเลข ตาราง; `scopeRows` ขับ Aha, choropleth, กราฟ, ฐานเทียบเฉพาะ/ร่วม ห้ามให้การเลือกย่านเดียวทำให้ทุกแบรนด์กลายเป็น “เฉพาะย่าน”
- 3D first Aha: หน้าแรกคือ preset `city` ที่โฟกัส 3 ย่านอันดับต้นอัตโนมัติ (`auto`); ออกจากสถานะนี้ได้ด้วย ดูทุกย่าน (`?areas=all`) หรือปุ่ม 3D เท่านั้น และตัวเลขต้องไม่เปลี่ยน
- focus + quiet: ส่วนที่โฟกัสมีสี โลโก้ อาคารที่ตั้ง มวลอาคารมุมโค้ง; ส่วนอื่นเป็นเส้นขอบบาง ป้ายจาง จุดบริบทสีเทาไม่มีโลโก้และไม่อยู่ใน tab order มวลอาคารเมืองโทนเงียบ
- basemap/massing เป็นบริบท: สีจาก `--basemap-*` เท่านั้น ความสูงจาก OSM ไม่ใช่ข้อเท็จจริงของชุดข้อมูล มุมโค้ง/การล้อมเป็น display-only อาคารที่ตั้งเป็นชั้นเดียวที่ถือสีข้อมูล
- กล้องไม่ขยับข้อมูล: `city` ภาพรวม, `model` (FOV 14) ย่าน, `eye` (มุมสถาปนิก) เฉพาะระดับสถานที่และเป็นค่าเริ่มต้นที่นั่น (`?cam=model` ปิด), `plan` เมื่อปิด 3D
- ระดับสถานที่คือโฟกัสของตัวเอง: เฉพาะอาคารของสถานที่นั้นสีน้ำเงิน เฉพาะร้านของสถานที่มีหมุดสี/โลโก้ ส่วนอื่นถอยเป็นบริบท; ฉาก `eye` ทำให้มวลอาคารรอบข้างโปร่งลงและอาคารที่บังสถานที่มองทะลุได้ โดยไม่แตะข้อมูล
- breadcrumb ประเทศไทย › จังหวัด › ย่าน › สถานที่ ใช้รหัสจังหวัดของ production (`js/model.js#PROVINCES`) และ Shopping Center id ของ CityMETER; ระดับย่านของสถานที่มาจาก point-in-polygon ไม่ใช่ชื่อ; ร้านไม่ใช่ crumb; ห้ามสร้าง Locale/municipality id เอง
- หนึ่งสาขาต่อหนึ่งหมุด ไม่มี aggregate; พิกัดต้นทางและตัวตนคงเดิม; โลโก้ ≤ 250 และเฉพาะ zoom ≥ 14
- choropleth ใช้ LDS `count` HEX เดียวกันสองธีม equal-interval 5 ระดับประกาศใน legend; measured zero ≠ missing; นอกขอบเขตไม่ระบายสี
- matrix ทุกช่องขนาดเท่ากัน ตัวเลขและระดับสีเท่านั้นที่มีความหมาย
- ไม่มี Caveats/Research badge/CSV ใน UI; สถานะปิดจริง วันที่ แหล่งข้อมูล และระดับความแม่นพิกัดคงอยู่
- LDS 0.9.7 tokens เท่านั้น; ไอคอน nav-7 FILL 0 / wght 300; ไม่มี decorative bracket หรือ colored left rail; focus ring มองเห็น; reduced motion
- ข้อมูลหลักต้องใช้ได้เมื่อแผนที่ไม่พร้อม; มี loading/slow/error/retry ที่ใช้งานได้

## เริ่มด้วยงานหนึ่งชิ้น

ใช้คำสั่งตั้งต้นนี้กับ coding agent แล้วแทน `Nxx` ด้วยงานใน backlog (หรือระบุงานใหม่):

```text
อ่าน AGENTS.md, PRODUCT_STATEMENT.md, handoff/PRODUCT_BRIEF.md และ handoff/product-brief.json
ทำเฉพาะงาน Nxx ใน handoff/IMPLEMENTATION_PLAN.md
ตรวจ source และสถานะจริงก่อนแก้ อย่าถือว่าทำเสร็จแล้ว
คงขอบเขตข้อมูลสามชั้น (scopeRows / baseRows / rows) และ focus modes, หลัก 3D first + focus + quiet, basemap tokens, camera presets, breadcrumb, source data, identities, coordinates และ LDS tokens
เพิ่มหรือปรับ tests ใน tests/ สำหรับพฤติกรรมที่เปลี่ยน แล้วตรวจ browser ที่ 390 และ 1280 ทั้งสองธีม
ส่งรายการไฟล์ที่แก้ ผลตรวจที่ทำจริง และประเด็นที่ยังไม่ยืนยัน
อย่าเปลี่ยนสูตร metric, taxonomy หรือสีข้อมูลเงียบ ๆ และอย่ารายงานว่าเผยแพร่แล้วจากผลในเครื่อง (ใช้ npm run verify:live)
```

## ตรวจความครบก่อนรับช่วง

1. `RELEASE_RECEIPT.json` ใน bundle ระบุ commit ที่เผยแพร่ ให้ `git checkout <commit>` แล้วเทียบ `handoff/handoff-manifest.json` กับไฟล์จริง (`npm run handoff:manifest` ต้องให้ hash เดิมบน working tree ที่สะอาด)
2. `npm test` ต้องผ่าน 81/81
3. `npm run verify:live` ต้องผ่านทุกไฟล์ที่เผยแพร่ (ดู `evidence/live-attestation.json` ใน bundle สำหรับผลตอนส่งมอบ)
4. เปิด 390 px และ desktop ทั้งสองธีม ไล่ flow: 3D first Aha → ดูทุกย่าน → ย่าน (มุมโมเดล) → สถานที่ (มุมสถาปนิก, อาคารของสถานที่เท่านั้นสีน้ำเงิน) → ร้าน → ปิดมุมสถาปนิก → ปุ่ม 3D (แผนผัง) → breadcrumb 4 ระดับ → กราฟ (matrix ช่องเท่ากัน) → ตาราง → help

ชุดส่งต่อเผยแพร่เฉพาะ source/data/assets ที่อยู่ใน repository และบทสรุปประยุกต์ ไม่แนบ private Drive/Sheet URLs, credentials, brief ภายในฉบับเต็ม หรือ LDS/token library ทั้งชุด
