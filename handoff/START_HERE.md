# CityMETER Luxury Brands — Developer Handoff

รุ่นเผยแพร่ 0.5 · 22 ต.ค. 2569 · ข้อมูลตรวจถึง 21 ต.ค. 2569

เริ่มอ่าน `source/handoff/README.md` จากนั้น Product Statement (`source/PRODUCT_STATEMENT.md` + `source/handoff/product-statement.json`), Product Brief และ Implementation Plan ในโฟลเดอร์ `source/handoff` ทั้ง `.md` และ `.json` ใช้คู่กัน

เข้าโฟลเดอร์ `source` แล้วรัน `npm test` และ `npm start` เปิด http://127.0.0.1:4173/

ชุดนี้มี source code (ES modules อ่านง่าย มีคอมเมนต์สัญญาทุกโมดูล), datasets, verified assets, 96 unit tests, JSON Schema 1.3.0, acceptance criteria AC01–AC27, สคริปต์สร้าง manifest/bundle และตรวจ live bytes อ่าน `source/AGENTS.md` ก่อนแก้ไข

สถานะโลโก้สถานที่ในรุ่นนี้: ไฟล์ตรวจแล้ว 33 จาก 50 (ชีต `10_VENUE_LOGOS`) อีก 17 ไฟล์ประกาศใน `data/venue-logos.json → meta.pending` งานต่อคือ plan N16 (ย้ายไฟล์ที่ตรวจ sha256 แล้วเข้า `assets/venue-logos/` และรัน `scripts/build-venue-logos.py`; ไม่ต้องแก้โค้ด)

เว็บจริง: https://montri-th.github.io/luxurybrands/
Repository: https://github.com/montri-th/luxurybrands

`RELEASE_RECEIPT.json` ผูกชุดส่งต่อกับ commit, ผล GitHub Pages และ live attestation ส่วน `evidence/` เป็นหลักฐานหน้าจอจริงและผลเทียบ hash ของไฟล์บนเว็บ แยกจาก source ที่ commit แล้ว
