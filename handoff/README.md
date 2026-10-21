# เริ่มงานต่อ — CityMETER Luxury Brands

รุ่นส่งต่อ 0.2 · ปรับล่าสุด 22 ตุลาคม 2569 · ข้อมูลตรวจถึง 21 ตุลาคม 2569

ชุดนี้ส่งต่อให้ developer หรือ coding agent พัฒนาต่อจาก repository ที่ใช้งานจริง หลักของรุ่นนี้คือ **อ่านเมืองผ่านย่านก่อน แสดงรายละเอียดเฉพาะส่วนที่ focus ส่วนอื่นให้เงียบ**

Live: [Luxury Brands](https://montri-th.github.io/luxurybrands/) · Source: [GitHub](https://github.com/montri-th/luxurybrands)

## อ่านตามลำดับนี้

| คนอ่าน | เครื่องอ่าน | ใช้ทำอะไร |
|---|---|---|
| [PRODUCT_BRIEF.md](PRODUCT_BRIEF.md) | [product-brief.json](product-brief.json) | เป้าหมาย ผู้ใช้ ขอบเขตข้อมูลสามชั้น Aha, สัญญาแผนที่ focus/quiet, แผงสี่โหมด, กราฟ, invariants |
| [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) | [implementation-plan.json](implementation-plan.json) | โมดูลและข้อต่อ, งานที่ทำแล้ว P01–P08, backlog N01–N06, acceptance AC01–AC14, วิธีทดสอบและ release |
| [VERIFICATION.md](VERIFICATION.md) | [handoff-manifest.json](handoff-manifest.json) | ผลตรวจแยกระดับ (unit / rendered / live) และ hash ของทุกไฟล์ |
| README นี้ | [handoff.schema.json](handoff.schema.json) | สัญญาโครงสร้างของ JSON ทั้งสาม |

`product-brief.json` และ `implementation-plan.json` เขียนด้วยมือและต้องแก้คู่กับ Markdown ส่วน `handoff-manifest.json` สร้างด้วย `npm run handoff:manifest` เท่านั้นและไม่ถูก track ใน git (อยู่ใน bundle ที่ `source/handoff/handoff-manifest.json`) ห้ามแก้ hash ด้วยมือ

ใช้ [PRODUCT_STATEMENT.md](../PRODUCT_STATEMENT.md), [DATA_METHOD.md](../DATA_METHOD.md), [NEIGHBORHOOD_METHOD.md](../docs/NEIGHBORHOOD_METHOD.md) และ [CHART_SELECTION.md](../docs/CHART_SELECTION.md) เป็นบริบทผลิตภัณฑ์และข้อมูล

## เปิดในเครื่อง

```sh
npm start      # http://127.0.0.1:4173/
npm test       # 62 unit tests บนข้อมูลจริง
```

เป็น static site ไม่มี build step ไม่ต้อง `npm install` ต้องมี Node ≥ 20 และ Python 3 แผนที่ต้องเข้าถึง unpkg.com (MapLibre) และ tiles.openfreemap.org ส่วนกราฟไม่ใช้ไลบรารีภายนอก การเปิด `index.html` เป็นไฟล์โดยตรงจะนำไปเว็บสาธารณะ

## สิ่งที่ห้ามทำหล่น

- ขอบเขตข้อมูลสามชั้น: `rows` ขับหมุด ตัวเลข ตาราง; `scopeRows` ขับ Aha, choropleth, กราฟ, ฐานเทียบเฉพาะ/ร่วม ห้ามให้การเลือกย่านเดียวทำให้ทุกแบรนด์กลายเป็น “เฉพาะย่าน”
- focus + quiet: ส่วนที่เลือกมีสี โลโก้ อาคาร; ส่วนอื่นเป็นเส้นขอบบาง ป้ายจาง จุดบริบทสีเทาไม่มีโลโก้และไม่อยู่ใน tab order
- หนึ่งรายการจุดขายต่อหนึ่งหมุด ไม่มี aggregate; พิกัดต้นทางและตัวตนคงเดิม; โลโก้ ≤ 250 และเฉพาะ zoom ≥ 13.5
- choropleth ใช้ LDS `count` HEX เดียวกันสองธีม equal-interval 5 ระดับประกาศใน legend; measured zero ≠ missing; นอกขอบเขตไม่ระบายสี
- ไม่มี Caveats/Research badge/CSV ใน UI; สถานะปิดจริง วันที่ แหล่งข้อมูล และระดับความแม่นพิกัดคงอยู่
- LDS 0.9.7 tokens เท่านั้น; ไอคอน nav-7 FILL 0 / wght 300; ไม่มี decorative bracket หรือ colored left rail; focus ring มองเห็น; reduced motion
- ข้อมูลหลักต้องใช้ได้เมื่อแผนที่ไม่พร้อม; มี loading/slow/error/retry ที่ใช้งานได้

## เริ่มด้วยงานหนึ่งชิ้น

ใช้คำสั่งตั้งต้นนี้กับ coding agent แล้วแทน `Nxx` ด้วยงานใน backlog (หรือระบุงานใหม่):

```text
อ่าน AGENTS.md, handoff/PRODUCT_BRIEF.md และ handoff/product-brief.json
ทำเฉพาะงาน Nxx ใน handoff/IMPLEMENTATION_PLAN.md
ตรวจ source และสถานะจริงก่อนแก้ อย่าถือว่าทำเสร็จแล้ว
คงขอบเขตข้อมูลสามชั้น (scopeRows / baseRows / rows), หลัก focus + quiet, source data, identities, coordinates และ LDS tokens
เพิ่มหรือปรับ tests ใน tests/ สำหรับพฤติกรรมที่เปลี่ยน แล้วตรวจ browser ที่ 390 และ 1280 ทั้งสองธีม
ส่งรายการไฟล์ที่แก้ ผลตรวจที่ทำจริง และประเด็นที่ยังไม่ยืนยัน
อย่าเปลี่ยนสูตร metric, taxonomy หรือสีข้อมูลเงียบ ๆ และอย่ารายงานว่าเผยแพร่แล้วจากผลในเครื่อง (ใช้ npm run verify:live)
```

## ตรวจความครบก่อนรับช่วง

1. `RELEASE_RECEIPT.json` ใน bundle ระบุ commit ที่เผยแพร่ ให้ `git checkout <commit>` แล้วเทียบ `handoff/handoff-manifest.json` กับไฟล์จริง (`npm run handoff:manifest` ต้องให้ hash เดิมบน working tree ที่สะอาด)
2. `npm test` ต้องผ่าน 62/62
3. `npm run verify:live` ต้องผ่านทุกไฟล์ที่เผยแพร่ (ดู `evidence/live-attestation.json` ใน bundle สำหรับผลตอนส่งมอบ)
4. เปิด 390 px และ desktop ทั้งสองธีม ไล่ flow: ภาพรวม → สำรวจ 3 ย่าน → ย่าน → สถานที่ → ร้าน → กราฟ → ตาราง → help

ชุดส่งต่อเผยแพร่เฉพาะ source/data/assets ที่อยู่ใน repository และบทสรุปประยุกต์ ไม่แนบ private Drive/Sheet URLs, credentials, brief ภายในฉบับเต็ม หรือ LDS/token library ทั้งชุด
