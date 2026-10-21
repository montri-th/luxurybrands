# เริ่มงานต่อ — CityMETER Luxury Brands

เอกสารปรับล่าสุด 22 ตุลาคม 2569 · ข้อมูลตรวจถึง 21 ตุลาคม 2569

ชุดนี้ส่งต่อให้ developer หรือ coding agent พัฒนาต่อจาก repository ที่ใช้งานจริง เป้าหมายล่าสุดคือ **เห็นภาพรวมย่านก่อน แล้วเลือกลงไปดูแบรนด์และจุดขายบนแผนที่**

Live: [Luxury Brands](https://montri-th.github.io/luxurybrands/) · Source: [GitHub](https://github.com/montri-th/luxurybrands)

## อ่านตามลำดับนี้

| คนอ่าน | เครื่องอ่าน | ใช้ทำอะไร |
|---|---|---|
| [PRODUCT_BRIEF.md](PRODUCT_BRIEF.md) | [product-brief.json](product-brief.json) | เป้าหมาย ผู้ใช้ ขอบเขต ประสบการณ์ และสัญญาที่ต้องรักษา |
| [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) | [implementation-plan.json](implementation-plan.json) | งาน P01–P08, dependencies, acceptance AC01–AC12 และวิธีตรวจ |
| README นี้ | [handoff-manifest.json](handoff-manifest.json) | ชุดไฟล์ ตัวตน release/hashes และผลตรวจของการส่งมอบ |

ไฟล์ JSON ทั้งสามต้องอยู่ในชุดส่งมอบสุดท้ายและมีชื่ออ้างอิงตรงกับ Markdown เอกสารนี้ไม่ใช้การมีลิงก์เป็นหลักฐานว่า machine file ถูกสร้างหรือผ่าน validation แล้ว ให้ตรวจรายการไฟล์และผลใน manifest ก่อนเริ่ม

ใช้ [PRODUCT_STATEMENT.md](../PRODUCT_STATEMENT.md), [DATA_METHOD.md](../DATA_METHOD.md), [NEIGHBORHOOD_METHOD.md](../docs/NEIGHBORHOOD_METHOD.md) เป็นบริบทผลิตภัณฑ์และข้อมูล เอกสารเดิมอาจอธิบาย UI รุ่นก่อน คำสั่งล่าสุดใน Product Brief ของ handoff นี้กำหนดประสบการณ์รอบปัจจุบัน

## เปิดในเครื่อง

ที่ root ของ repository:

```sh
npm start
```

เปิด `http://127.0.0.1:4173/` แล้วรันการตรวจด้วย:

```sh
npm test
```

เป็น static site ไม่มี build step และไม่ต้อง `npm install` เพื่อเริ่มงาน ต้องมี Python 3 และ Node ที่รองรับ test runner; แผนที่/กราฟใช้เครือข่าย การเปิด `index.html` เป็นไฟล์โดยตรงจะนำไปเว็บสาธารณะ

## สิ่งที่ห้ามทำหล่น

- Aha และกราฟหลักเริ่มจากย่าน ศูนย์การค้า/อาคารเป็นการเจาะต่อ ไม่ใช้ center-first Aha เดิมเป็นผลสุดท้าย
- หนึ่งรายการจุดขายต่อหนึ่งหมุด ไม่มี aggregate cluster; source coordinates และ identity เดิมคงอยู่
- โลโก้สูงสุด 250 และให้ต่างแบรนด์ก่อน ป้ายชนกันซ่อนเฉพาะโลโก้ จุดอื่นยังมีหมุดสีประเภท ไม่ลากเส้นทุกจุด
- ไม่มี Caveats/Research demo badge/method panel หรือ CSV ใน UI; ข้อมูลต้นทาง สถานะปิด วันที่ และเอกสารยังคงอยู่
- ตัวกรองร่วมใช้กับแผนที่ ตัวเลข Aha กราฟ และตาราง มีทางล้าง selection
- LDS 0.9.7, glyph ที่อนุมัติ น้ำหนักไอคอน 300 outline; ไม่มี brackets ตกแต่งหรือ colored left rail
- Popup มีคู่สีอ่านได้ในทั้งสองธีมและไม่ถูก lazy vendor CSS ทับ; mobile portrait ใช้แผงล่างโดยไม่มี popup ซ้ำ
- ข้อมูลหลักต้องใช้ได้เมื่อแผนที่ กราฟ หรือข้อมูลเสริมไม่พร้อม มี loading/error/retry ที่ใช้งานได้

## เริ่มด้วยงานหนึ่งชิ้น

ใช้คำสั่งตั้งต้นนี้กับ coding agent แล้วแทน `Pxx` ด้วยงานที่เลือก:

```text
อ่าน handoff/PRODUCT_BRIEF.md และ machine contract ที่คู่กัน
ทำเฉพาะงาน Pxx ใน handoff/IMPLEMENTATION_PLAN.md
ตรวจ source และสถานะจริงก่อนแก้ ห้ามถือว่า target features ทำเสร็จแล้ว
คง source data, identities, coordinates, shared filters และ LDS ที่ระบุ
เพิ่มหรือปรับ acceptance tests ของพฤติกรรมที่เปลี่ยน แล้วตรวจ browser ใน flow ที่เกี่ยวข้อง
ส่งรายการไฟล์ที่แก้ ผลตรวจที่ทำจริง และประเด็นที่ยังไม่ยืนยัน
อย่าเปลี่ยนสูตร metric หรือ taxonomy เงียบ ๆ และอย่ารายงานว่าเผยแพร่แล้วจากผลในเครื่อง
```

District Aha และกราฟย่านทั้งสาม implemented แล้ว Unit suite ผ่าน 51/51 และตรวจภาพจริงแบบ spot checks: IAB 1280 px ธีมมืด, เลือกสยาม 64 POS/compare ขั้นต่ำ 2 ย่าน และ mobile Aha 3 ย่าน 175 POS/97 แบรนด์ LDS static ผ่านและ package ผ่าน 9,768 checks ตัวเลข snapshot ใช้ตรวจ regression ไม่คัดไป hardcode ใน UI

AC02 ยังไม่ได้ตรวจเปิด `file:` จริงใน native Chrome/Safari มีเพียง source/VM checks จึงไม่อ้างว่า AC01–AC12 ผ่านครบทั้งหมด ผล public release/commit/hashes รอบสุดท้ายอยู่ใน `handoff-manifest.json` และ release receipt ที่แนบกับ bundle แยกจากผล local/browser ข้างต้น

## ตรวจความครบก่อนรับช่วง

ตรวจว่า commit และไฟล์ใน manifest ตรงกับ checkout, JSON parse ได้, references ภายในชุดไม่หาย และ `npm test` ผ่าน จากนั้นตรวจหน้าจอ 390 px/desktop, light/dark, shared filters, mobile details และ retry เก็บหลักฐาน local/browser/live แยกกัน

ชุดส่งต่อเผยแพร่เฉพาะ source/data/assets ที่อยู่ใน repository และบทสรุปประยุกต์ ไม่แนบ private Drive/Sheet URLs, credentials, brief ภายในฉบับเต็ม หรือ LDS/token library ทั้งชุด
