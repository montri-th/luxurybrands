# CityMETER: Luxury Brands Thailand

Demo สำรวจแบรนด์ luxury, upscale streetwear, Thai designers และ curated retailers ในประเทศไทย พร้อมแผนที่ Shopping Center บริบทศูนย์การค้า คลัสเตอร์ตามระยะ และหลักฐานรายรายการ

**Research snapshot: 21 Oct 2026 · Record grain: brand–point of sale · Artifact status: public research demo, not production.**

ฐานรวบรวมใหม่มี **349 รายการจุดขาย** และเก็บประวัติต้นฉบับของมายด์ **352 แถว** ไว้ตรวจสอบย้อนกลับ การจับคู่ประวัติกับรายการใหม่ไม่ทำให้เป็นจุดขายเพิ่มอีกหนึ่งแห่ง ตัวเลขพิกัด สถานะปิด และความครอบคลุมล่าสุดให้อ่านจาก `meta` ใน [data/luxury.json](data/luxury.json) และสถานะบนหน้าจอ

## ใช้งาน

```sh
npm start
```

เปิด <http://127.0.0.1:4173> ต้องเปิดผ่าน HTTP เพื่อโหลดไฟล์ข้อมูล; ไม่ต้อง build หรือติดตั้ง dependencies ภายในโปรเจกต์ การแสดงแผนที่และกราฟใช้เครือข่ายเพื่อโหลด MapLibre GL 5.6.2, amCharts 5.20.8 และ OpenStreetMap tiles

```sh
npm test
```

ชุดทดสอบตรวจขอบเขตสถานะ การนับแบรนด์เทียบกับจุดขาย จุดที่ไม่มีพิกัด คลัสเตอร์ การกรองร่วม และการส่งออก CSV ส่วนการตรวจหน้าจอจริง ความอ่านง่าย และพฤติกรรมกราฟต้องตรวจในเบราว์เซอร์แยกต่างหาก

## สิ่งที่สำรวจได้

- แผนที่จุดขายและศูนย์การค้า พร้อมแยกจุดตัวแทนอาคารออกจากพิกัดร้าน
- อันดับศูนย์การค้าตามแบรนด์ไม่ซ้ำ, treemap สัดส่วนรายการจุดขาย และ scatter เปรียบเทียบแบรนด์กับรายการจุดขาย
- กลุ่มจุดที่เชื่อมกันในระยะเริ่มต้น 800 เมตร ปรับเป็น 500 หรือ 1,200 เมตรได้
- รายการเดิมที่ยังยืนยันใหม่ไม่ได้ และร้านที่มีหลักฐาน `permanently closed` โดยไม่ลบประวัติ
- ตัวกรองเดียวกันใช้กับแผนที่ ตัวเลข กราฟ คลัสเตอร์ และตาราง; ดาวน์โหลดรายการที่เลือกเป็น CSV ได้

โครงสร้างหน้าจออ้างอิง [CityMETER Shopping Center production](https://landometer.com/v3/citymeter?d=shoppingCenter): header แบบกะทัดรัด แผนที่หลัก แผงข้อมูลด้านขวา และแผง insight ด้านล่าง แผงขวา production ใช้ `min(max(260px, 25%), 440px)`; demo ปรับรายละเอียดสำหรับจอเล็ก

กราฟดัดแปลงจากตัวอย่างทางการของ amCharts: [Bar chart race](https://www.amcharts.com/demos/bar-chart-race/) (อ้างอิงโครงสร้างแท่งแนวนอน; demo นี้ไม่ใช้การแข่งตามเวลา), [Simple treemap](https://www.amcharts.com/demos/simple-treemap/) และ [Bubble chart](https://www.amcharts.com/demos/bubble-chart/) โดยใช้ API ของ [Scatter chart](https://www.amcharts.com/demos/scatter-chart/) สำหรับจุดเปรียบเทียบ ไม่มีข้อมูลตัวอย่างของ amCharts ปะปนกับข้อมูลชุดนี้

## Data and method

อ่าน [DATA_METHOD.md](DATA_METHOD.md) ก่อนตีความผล จำนวนแบรนด์ในข้อมูลไม่ใช่ส่วนแบ่งตลาด ยอดขาย กำลังซื้อ หรือความครบถ้วนของตลาดไทย พิกัดที่ไม่มีข้อมูลยังอยู่ในตัวหารของตาราง แต่ไม่ถูกสร้างตำแหน่งขึ้นบนแผนที่

- [Research master ใน Google Sheets](https://docs.google.com/spreadsheets/d/1OPZfjEhkox3fYGPyZX0idTOQh-DgJI359TsD_3iywCg/edit)
- [ต้นฉบับของมายด์](https://docs.google.com/spreadsheets/d/1YTxuha3X_frYrggOAIj8S4jvzT_Rk-vwsfEI38FNCZI/edit)
- [CityMETER Shopping Center](https://landometer.com/v3/citymeter?d=shoppingCenter)

## Assets and verification

ใช้ LDS **0.9.7 / v0.9.7-owner.1** พร้อม fonts และ production color tokens ที่บันทึก byte length และ SHA-256 ใน [assets/manifest.json](assets/manifest.json) การตรวจแพ็กเกจ authority ผ่าน **9,768 checks** ในงานนี้; ผลดังกล่าวไม่ใช่การรับรองว่า demo ทุกหน้าผ่านการตรวจ UI หรือผ่านการทดสอบ production แล้ว ต้องรายงานผลหน้าจอจริงแยกจาก hash/package checks

คงเครื่องหมาย amCharts และ attribution ของ OpenStreetMap ตามสิทธิ์ผู้ให้บริการ ไม่ได้รวมสิทธิ์ redistributable สำหรับข้อมูลหรือสื่อทุกอย่างของแบรนด์ ไฟล์นี้เป็น research/demo snapshot และยังต้องจัดทำกระบวนการอัปเดต สิทธิ์ข้อมูล และ field validation ก่อนยกระดับเป็น production dataset
