# CityMETER Luxury Brands — Product Brief

รุ่นส่งต่อ 0.3 · ปรับเอกสาร 22 ตุลาคม 2569 · ข้อมูลตรวจถึง 21 ตุลาคม 2569 · ใช้คู่กับ [product-brief.json](product-brief.json)

เอกสารนี้กำหนดประสบการณ์ที่ทีมพัฒนาต้องรักษาและต่อยอด เจตนาผลิตภัณฑ์และ winning strategy อยู่ใน [PRODUCT_STATEMENT.md](../PRODUCT_STATEMENT.md) (+ [product-statement.json](product-statement.json)); brief ฉบับนี้คือสัญญาของหน้าจอรุ่นปัจจุบัน หาก machine contract กับเอกสารนี้ขัดกัน ให้ถือ JSON เป็นหลักและแก้ทั้งสองฉบับพร้อมกัน

## สิ่งที่เปลี่ยนในรุ่น 0.3 (จากคำสั่งเจ้าของ 22 ต.ค.)

| คำสั่ง | สิ่งที่ทำ | ที่อยู่ในโค้ด |
|---|---|---|
| First Aha ต้องชัดและเห็น 3D ก่อน | หน้าแรกเปิดเป็นเมือง 3 มิติ (preset `city`) ที่โฟกัส 3 ย่านอันดับต้นโดยอัตโนมัติ (focus mode `auto`) ส่วนอื่นเงียบ | `js/app.js` (autoFocus, fitMap), `js/camera.js` |
| สไตล์ classy แบบ archiMap / rounded buildings (#1047) | basemap “paper” ที่สร้างเองบน OpenFreeMap; มวลอาคารทั้งเมืองจาก OSM (quiet); อาคารในย่านโฟกัส **มุมโค้ง** และโทนเข้มขึ้น (decode tile → offset+fillet → extrude) | `js/map-style.js`, `js/massing.js`, `js/mvt.js`, `js/geometry.js` |
| Product statement ต้องเป็น winning strategy | เขียนใหม่ตาม Who/What/Which/How ของ MBB v0.5.3 + PB v6 §1.6 พร้อมป้ายหลักฐาน และ JSON | `PRODUCT_STATEMENT.md`, `handoff/product-statement.json` |
| Breadcrumb เข้ากับ production | ประเทศไทย › จังหวัด › ย่าน › สถานที่ ด้วยรหัสจังหวัดของ production (BKK, PKT, CMI…) และ Shopping Center id ของ CityMETER เป็น id ของสถานที่ | `js/breadcrumb.js`, `js/model.js` (PROVINCES), `data/neighborhoods.geojson` (provinceCode) |
| Matrix สับสนเรื่องขนาดช่อง | ตาราง `table-layout: fixed` ช่องเท่ากันทุกช่อง คำอธิบายระบุว่าขนาดไม่มีความหมาย | `js/charts.js`, `styles.css` |
| 3D close-up แบบ 2-point perspective | preset `model` (FOV 14° → เส้นตั้งตั้งตรง) ในย่าน; ระดับสถานที่ใช้ preset `eye` (pitch 75°, FOV 24° — ขอบฟ้านอกจอ) เป็นค่าเริ่มต้น จัดกรอบพอดีอาคารของสถานที่ อาคารรอบข้างจางมาก อาคารที่บังโปร่งใส; เฉพาะอาคารของสถานที่นั้นเป็นสีน้ำเงิน | `js/camera.js`, `js/massing.js` (SCENE, setScene), `js/app.js` (detailRows, frameVenue) |
| 3D styling แบบ simplified cartoon, focus/quiet | สองชั้นมวลอาคาร + อาคารที่ตั้งร้านสีน้ำเงิน; sky/fog ทำให้ระยะไกลจาง | `js/massing.js`, `js/map-style.js` (sky, light) |

## ผลิตภัณฑ์ช่วยตัดสินใจอะไร

**ถ้าจะเปิดร้านที่นี่ จะอยู่ข้างใคร — และย่านนี้ยังขาดใคร** ผู้ใช้ต้องได้ภาพที่มีความหมายทันทีที่เปิดหน้า ไม่ต้องตั้งค่าตัวกรองก่อน และทุกการเจาะต่อต้องเห็นได้ว่ากำลังดูส่วนไหนของเมือง (breadcrumb + focus/quiet)

| ผู้ใช้ (Hypothesis — ดู statement §2.1) | งานที่ต้องทำ | เส้นทางที่ผลิตภัณฑ์รองรับ |
|---|---|---|
| ทีมขยายสาขาและ distributor ของแบรนด์หรู | เลือกย่าน/ศูนย์สำหรับร้านใหม่หรือย้าย | 3D first Aha → โปรไฟล์ย่าน (ใครอยู่ข้างใคร) → สถานที่ → สาขาพร้อมหลักฐาน |
| ทีม leasing / asset ของศูนย์การค้า | หา gap และ exclusive ของ tenant mix | โปรไฟล์ย่าน → บุคลิกตามกลุ่ม → แบรนด์เฉพาะ/ร่วม → matrix |
| นักวิเคราะห์และที่ปรึกษา | หลักฐานที่ตรวจกลับได้สำหรับ proposal | กราฟเปรียบเทียบ → ตาราง → แหล่งข้อมูลรายรายการ → JSON |

การทำงานเร็วขึ้นหรือเลือกทำเลได้ดีขึ้นเป็นผลที่ต้องวัดกับผู้ใช้ (statement §7) ไม่ใช่ผลที่ผลิตภัณฑ์พิสูจน์แล้ว

## สิ่งที่อยู่ในขอบเขต

ข้อมูลครอบคลุมประเทศไทย รวม luxury designers, fine jewellery, watches, upscale streetwear, Thai designers, curated retailers และกลุ่มขยาย beauty/fragrance กับ accessible premium ที่กรองแยกได้ หน่วยข้อมูลคือ **brand–point-of-sale observation**: หนึ่งรายการต่อหนึ่งหมุด ไม่รวมหมุด ไม่นับเป็นหน้าร้านอิสระ พิกัดต้นทาง สถานะ และประวัติคงเดิมเสมอ

| ชั้นข้อมูล | ไฟล์ | บทบาท |
|---|---|---|
| แบรนด์–สาขา | `data/luxury.json` | ตัวตน สถานะ วันที่ แหล่งข้อมูล พิกัด รูปแบบร้าน host |
| ย่าน | `data/neighborhoods.geojson` | แกนย่านเชิงวิเคราะห์ 10 ย่าน polygon คงที่ priority, ID และ `provinceCode` คงที่ |
| อาคารที่ตั้ง | `data/venue-buildings.geojson` | รูปทรงอาคารที่ตั้งและ building parts พร้อมที่มาความสูง |
| มวลอาคารเมือง | OpenFreeMap tiles (`building` source-layer) | บริบท 3 มิติทั้งเมือง (quiet) และวัตถุดิบของอาคารมุมโค้งในย่านโฟกัส; ไม่ใช่ข้อมูลของชุดนี้ |
| อัตลักษณ์แบรนด์ | `data/brand-logos.json`, `assets/brand-logos.svg` | โลโก้ต้นฉบับที่อนุมัติและ alias |

ค่าเริ่มต้นใช้ cohort `refresh` (market_refresh ยกเว้น permanently closed และ closure_conflict_review) ประวัติเดิมและรายการปิดถาวรยังเลือกดูได้ รายการที่ไม่มีพิกัดอยู่ในตารางและจำนวน แต่ไม่สร้างตำแหน่งขึ้นใหม่

## ขอบเขตข้อมูลสามชั้นที่ทุกมุมมองต้องใช้ร่วมกัน

| ชั้น | นิยาม | ใครใช้ |
|---|---|---|
| `scopeRows` | รายการหลังตัวกรอง search/cohort/segment/province/channel/venue **ก่อน** เลือกย่านหรือ focus | Aha (ตัวหาร), choropleth, กราฟเปรียบเทียบ, โปรไฟล์ย่าน (ฐานเทียบเฉพาะ/ร่วม), จุดบริบทบนแผนที่ |
| `baseRows` | `scopeRows` ที่แคบลงด้วยย่านที่เลือก | อันดับย่านในแผง, Aha เมื่อเลือกย่าน |
| `rows` | `baseRows` ที่แคบลงด้วย area focus | หมุดแบบละเอียด ตัวเลขรวม ตาราง อาคารที่ตั้ง มวลอาคารโฟกัส |

Area focus มีสามโหมด (`state.focusAreaIds`, `state.autoFocus`):

| โหมด | ความหมาย | URL |
|---|---|---|
| `auto` (ค่าเริ่มต้น) | 3 ย่านอันดับต้นของ scope ปัจจุบันเป็น focus โดยอัตโนมัติ — หน้าแรกจึงเป็น first Aha ที่โฟกัสแล้ว | ไม่มี `areas` |
| `explicit` | ผู้ใช้เลือกย่านเอง (≤ 3) | `?areas=siam,phrom-phong` |
| `none` | ทุกย่านแสดงเท่ากัน ไม่มี quiet | `?areas=all` |

เหตุผลเดิมยังอยู่: การเลือกย่านหนึ่งย่านต้องไม่ทำให้ “แบรนด์เฉพาะย่าน” กลายเป็น 100% และกราฟต้องยังเทียบทุกย่านในตัวกรอง หน้าจอบอกด้วยคำอธิบาย `… · เทียบทุกย่าน ไม่รวมการเลือกย่าน` และตัวเลขรวมในโหมด focus ระบุ “ในโฟกัส” พร้อมบรรทัด “ทั้งหมดในตัวกรอง …”

## Aha แรก: ย่านก่อนสถานที่ และเห็น 3D ก่อน

เมื่อข้อมูลพร้อม แผงแสดง **สัดส่วนแบรนด์ไม่ซ้ำที่อยู่ใน 3 ย่านอันดับต้น** (ตัวเศษ/ตัวหาร, สาขา, ย่านที่มีแบรนด์เฉพาะมากที่สุด) และแผนที่เปิดมาเป็นเมือง 3 มิติที่ **โฟกัส 3 ย่านนั้นแล้ว** (สี ป้าย หมุด อาคารที่ตั้ง อาคารมุมโค้ง) ส่วนอื่นเป็นเส้นขอบ ป้ายจาง จุดเทา และมวลอาคารจาง ปุ่มหลักคือ “ดูทุกย่าน” (ยกเลิก quiet) และ “เปรียบเทียบย่าน” ห้ามใส่ชื่อย่านหรือเปอร์เซ็นต์ตายตัวใน markup

สูตรอยู่ใน `js/area-insight.js#summarizeAreaInsight` (เลือกสูงสุด 3 ย่าน เรียงแบรนด์ไม่ซ้ำ → สาขา → stable ID; ตัวหารคือแบรนด์ไม่ซ้ำทั้งหมดใน `baseRows`) ข้อค้นพบรองใช้ `js/profile-model.js#buildOverviewInsights` กล้องแรกคือ `fitPitched(bounds of the 3 areas, preset city)` ที่ตรวจว่าทุกจุดยอดของ polygon อยู่ในจอ

เมื่อไม่มีย่านใดมีสาขา (เช่น กรองเฉพาะภูเก็ต) Aha ต้องบอกว่ารายการอยู่นอกแกนย่านที่นิยามไว้ แล้วให้อันดับสถานที่ (`rankVenues`) แทน เมื่อไม่พบรายการเลยต้องบอกว่าไม่พบตามตัวกรอง พร้อมทางล้างตัวกรอง

## แผนที่: focus + quiet context

หลักการจากเจ้าของผลิตภัณฑ์ (22 ตุลาคม 2569): **แสดงรายละเอียดเฉพาะส่วนที่กำลัง focus ส่วนที่ไม่สำคัญให้เงียบ**

| สถานะ | ส่วนที่ focus | ส่วนบริบท (quiet) |
|---|---|---|
| หน้าแรก (auto focus) | 3 ย่านอันดับต้น: สี `count`, ป้าย + ตัวนับ, หมุดสีประเภท, อาคารที่ตั้ง, มวลอาคารมุมโค้ง (zoom ≥ 13) | ย่านอื่นเส้นขอบบาง ป้ายจาง; รายการนอก focus เป็นจุดเทาเล็ก; มวลอาคารจางทั้งเมือง; ไม่มีโลโก้ต่ำกว่า zoom 14 |
| ดูทุกย่าน (`areas=all`) | ทุกย่านระบายสี | หมุดเป็นจุดเล็กตาม zoom; มวลอาคารจาง; ไม่มีอาคารมุมโค้ง |
| เลือกย่านเดียว | ย่านนั้นคงสี (ต่ำกว่า zoom 14.5) เส้นขอบเลือก อาคารที่ตั้ง มวลอาคารมุมโค้ง หมุดสีประเภท โลโก้ | เหมือนหน้าแรก |
| เปิดสถานที่ (ศูนย์การค้า) | เฉพาะแถวของสถานที่นั้น: หมุดสีประเภท โลโก้ และอาคารที่ตั้งสีน้ำเงินเฉพาะอาคารของสถานที่นั้น; กล้อง `eye` จัดกรอบพอดีอาคาร | ร้านของสถานที่อื่นเป็นจุดเทา อาคารของสถานที่อื่นถอยเป็นมวลอาคารเงียบ; มวลอาคารทั้งหมดโปร่งลง (SCENE.eye) และอาคารที่บังสถานที่โปร่งใส |
| เลือกร้าน | หมุดที่เลือกมีวงเน้น เส้นชี้พิกัดต้นทาง popup บนเดสก์ท็อป | ตาม focus ปัจจุบัน (ร้านในศูนย์ = ระดับสถานที่) |

กติกาที่ต้องรักษา:

- Choropleth ใช้ค่า HEX ของ LDS `count` ชุดเดียวกันทั้งสองธีม fill opacity 1 วางใต้ชั้นเส้นแรกของ basemap (`waterway`) ตัดการแสดง fill ที่ zoom ≥ 14.5 แบบสวิตช์ (DATAVIZ-03)
- equal-interval 5 ระดับจากค่าสูงสุดของ `scopeRows` ประกาศช่วงในคำอธิบาย ย่านที่นิยามไว้แต่ไม่พบแบรนด์เป็น `measured_zero` พื้นที่นอกย่านคือ `out_of_scope` (EVID-05)
- หนึ่งหมุดต่อหนึ่งรายการ ไม่มี cluster; โลโก้สูงสุด 250 เฉพาะ zoom ≥ 14 และเฉพาะรายการใน focus
- อาคารที่ตั้งใช้สี `map.activeLayer`; มวลอาคารใช้ basemap-only tokens ไม่ใช่สีข้อมูล
- ไม่ย้ายพิกัดร้านเพื่อให้ตรงอาคารหรือป้าย

## Basemap “paper” (สร้างเอง)

`js/map-style.js#buildMapStyle(theme)` สร้าง style v8 บน `https://tiles.openfreemap.org/planet` (OpenMapTiles schema) และ glyph ของ OpenFreeMap ไม่ใช้ style สำเร็จรูป Positron/Dark อีกต่อไป เพื่อให้เมืองเงียบใต้สีข้อมูล และให้ชั้น 3 มิติมีลำดับที่รู้แน่:

พื้นดิน → landcover/park/water → **data fill (แทรกก่อน `waterway`)** → footprint 2D → ถนน/ราง → **มวลอาคาร + อาคารที่ตั้ง (แทรกก่อน `water-name`)** → ป้ายชื่อ → เส้นขอบย่าน/เส้นเลือก (บนสุด)

ค่าสีทั้งหมดเป็น `--basemap-*` ใน `assets/theme.css` (สว่าง: พื้น = LDS `surface.alt`, น้ำ = `surface.blue-tint`, casing = borders, ป้าย = text roles; สีพื้นที่สีเขียว/อาคาร/มวลอาคารประกาศครั้งเดียวที่นั่น) ไม่มี POI, เลขที่บ้าน, เขตปกครอง; ป้ายใช้ `name:th` ก่อน `name`; `sky`/fog ทำให้ระยะไกลจางเป็นสีกระดาษ (quiet); `light` แบบ viewport ให้ร่มเงาอ่อนบนมวลอาคาร

## มวลอาคารสองชั้น + อาคารที่ตั้ง (`js/massing.js`)

| ชั้น | แหล่ง | ลักษณะ | เมื่อไร |
|---|---|---|---|
| CITY (quiet) | fill-extrusion จาก `building` source-layer ของ tile โดยตรง (`render_height`, `render_min_height`, ข้าม `hide_3d`) | สี `--basemap-massing-quiet`, vertical gradient, ไม่มีเส้นขอบ | zoom ≥ 13, เฉพาะมุมมอง 3D |
| FOCUS (detail) | tile เดียวกัน (URL เดียวกับที่ MapLibre โหลด → browser cache) ถอดด้วย `js/mvt.js` เฉพาะ tile ที่แตะย่านโฟกัส (≤ 9 tiles, z14) → เฉพาะอาคารที่ซ้อนทับ polygon ย่าน → ตัด buffer ที่ขอบ tile → **offset ออก d แล้วลบมุมโค้ง r** → extrude ที่ `render_height + 0.35 m` | สี `--basemap-massing-focus`; r = 4 px ในหน่วยเมตร (3–12 m), d = r/2.5 (≥ 1 m) คำนวณใหม่เมื่อข้าม zoom ระดับเต็ม | zoom ≥ 13; ในแผนผัง 2 มิติยังแสดงเป็น footprint มุมโค้งแบบแบน |
| HOST (อาคารที่ตั้งร้าน) | `data/venue-buildings.geojson` (`js/buildings.js`) | สี `map.activeLayer`; เส้นขอบ `map.selectedStroke` | zoom ≥ 14 (extrusion), ≥ 12 (outline); ทั้ง 2D/3D |

**ฉากระดับสถานที่ (`SCENE.eye`)**: เมื่อกล้องเป็น `eye` มวลอาคารเมืองลด opacity เป็น 0.16 (ปกติ 0.22 และจางลงตามระยะจากย่านโฟกัสจนหายไปที่ ~2.2 กม.) และชั้นโฟกัสเป็น 0.62 (surroundings quiet มาก) ส่วนอาคารชั้นโฟกัสที่ยืนอยู่ระหว่างกล้องกับอาคารของสถานที่ (ทดสอบกล่องบนจอ: กล่องอาคารรวมความสูงซ้อนกล่องเป้าหมาย และพื้นอาคารอยู่ใกล้กล้องกว่า) ย้ายไปชั้น `focus-massing-occluding` ที่ opacity 0.14 = มองทะลุได้ คำนวณใหม่ทุก `moveend` และทุกครั้งที่ tile มาใหม่ อาคารของสถานที่ (HOST) ทึบเสมอ

การล้อมรอบ (enclosure) ทำให้ต้นฉบับใน CITY อยู่ภายในรูปโค้งของ FOCUS ทั้งก้อน จึงไม่มี z-fighting; อาคาร OSM ที่ซ้อนกับ HOST ถูกตัดจาก FOCUS และซ่อนใน CITY ด้วย `['!', ['in', ['id'], …]]` (feature id = OSM id) ความสูงเป็นบริบทจาก OSM/OpenMapTiles (มีค่า default เมื่อไม่มี tag) ไม่ใช่ข้ออ้างของชุดข้อมูล ข้อจำกัด: tile ของ OpenFreeMap รวมอาคารความสูงเดียวกันเป็น MultiPolygon เดียว จึงเลือกต่อหลังคาไม่ได้; ใน container ทดสอบที่ไม่มีเครือข่าย ใช้ tile สังเคราะห์ (ดู VERIFICATION)

## กล้อง (`js/camera.js`)

| preset | ใช้เมื่อ | ค่า |
|---|---|---|
| `plan` | ปิด 3D (ปุ่ม “3D”) หรือกรอบกว้างกว่า 0.3° | pitch 0 |
| `city` | ภาพรวม/first Aha ในโหมด 3D | pitch 56, bearing 28 (แกน สยาม→พร้อมพงษ์ นอนตามความกว้างจอ), FOV 36.87 |
| `model` | ย่าน (และระดับสถานที่เมื่อปิดมุมสถาปนิก) ในโหมด 3D | pitch 60, bearing 28, **FOV 14** → ใกล้ axonometric เส้นตั้งตั้งตรง |
| `eye` (“มุมสถาปนิก”) | ระดับสถานที่ (โหมดสถานที่ หรือร้านที่อยู่ในสถานที่) เป็นค่าเริ่มต้น; ปุ่มปิดได้ (`?cam=model`); ปิดใช้ในระดับอื่นและใน 2D; บนมือถือรอจน sheet ปิด | pitch 75, FOV 24 (ขอบฟ้าอยู่นอกจอ — MapLibre 5.6.2 วาด fill-extrusion ผิดเมื่อขอบฟ้าเข้าจอ) = เปอร์สเปกทีฟ 2 จุด; `frameVenue` fit อาคารของสถานที่ (ทุกจุดยอด + headroom 20%) |

`fitPitched` เริ่มจาก `cameraForBounds` (flat) แล้วปรับ zoom ทีละ 0.1 จนทุกจุดยอดของ polygon อยู่ใน viewport ที่มี padding; บนเดสก์ท็อป padding ของมุมมอง 3D ไม่นับ legend; บนมือถือแนวตั้งเมื่อ sheet เปิดใช้ `plan` แล้วปรับเป็น 3D เมื่อปิด sheet MapLibre ไม่มีกล้อง orthographic — FOV แคบคือวิธีมาตรฐาน; `setVerticalFieldOfView` มีตั้งแต่ MapLibre 4.7

## Breadcrumb และความเข้ากันได้กับ production

แถวบนของแผง: **ประเทศไทย › จังหวัด › ย่าน › สถานที่** (`js/breadcrumb.js`) รหัสจังหวัดตรงกับ path ของ production ที่สังเกตเมื่อ 22 ต.ค. 2569 (`/v3/citymeter/BKK`, `/PKT`, `/CMI`, `/SPK`, `/NBI`, `/CBI`, `/PTE`, `/UDN`, `/NMA`) และระดับที่สามของ production เข้ารหัสชนิดใน path (`/L/{locale uuid}` = Locale, `/M/{dopa code}` = เทศบาล) ย่านของชุดนี้ยังไม่ใช่ Locale จึงเสนอ `/N/{neighborhood id}` ในระหว่างที่ยังไม่ลงทะเบียน ระดับที่สี่คือสถานที่: ศูนย์การค้าที่จับคู่แล้วใช้ Shopping Center id ของ CityMETER (`centers[].id`) จึงเสนอ `/V/{center id}`; demo (static) ใช้ `?province=BKK&neighborhood=siam&place=<id>` และรับทั้งรหัสและชื่อจังหวัดใน URL เก่า กติกา: ระดับย่านของสถานที่มาจาก point-in-polygon ของจุดตัวแทนสถานที่ (ไม่ใช่ชื่อ) สถานที่นอกย่านทั้ง 10 ข้ามระดับย่าน ร้านเป็นหัวเรื่องของแผง ไม่ใช่ crumb บนจอแคบเมื่อมี 4 ระดับ ระดับบนพับไว้หลัง “…” (ปุ่มขยาย) โดยสองระดับสุดท้ายเห็นเสมอ

## แผงอ่านข้อมูล

สี่โหมด (overview / neighborhood / venue / store) และปุ่มย้อนกลับ ทุกปุ่มส่ง `data-action` เดียวกัน (`js/panel.js`) เพิ่ม actions `crumb-country`, `crumb-province`, `crumb-area`, `toggle-3d` ตัวกรองยุบอยู่ใน disclosure พร้อมตัวนับและชิป ช่องค้นหาอยู่บนสุดเสมอ ระดับความแม่นพิกัดอ่านจาก `describeGeometry` ห้ามยกระดับจุดตัวแทนอาคารเป็นจุดร้าน

## กราฟเปรียบเทียบย่าน

| key | คำถาม | การเข้ารหัส | สี |
|---|---|---|---|
| `centers` (อันดับ) | ย่านใดมีแบรนด์หลากหลาย | แท่งแนวนอน แบรนด์ไม่ซ้ำ + สาขากำกับ | ระดับ `count` เดียวกับแผนที่ |
| `mix` | ย่านใดเด่นกลุ่มไหน | ตารางตัวเลข ย่าน × กลุ่ม **ทุกช่องขนาดเท่ากัน** (`table-layout: fixed`, `<colgroup>`) ตัวเลขทุกช่อง; คำอธิบายบอกว่าขนาดไม่มีความหมาย | ระดับ `count` ของช่อง (legend แยก) 0 = measured zero มีเส้นขอบศูนย์ |
| `compare` | แบรนด์ของย่านต่างหรือซ้ำกับย่านอื่นเพียงใด | แท่งซ้อน เฉพาะย่าน / พบในย่านอื่นด้วย | series.07 (hexagon) / series.09 (dash) |

กราฟใช้ `scopeRows` และไฮไลต์ย่านที่เลือก กรณี compare มีน้อยกว่า 2 ย่านแสดงปุ่ม “ดูทุกย่าน” “เฉพาะ/ร่วม” หมายถึงภายในข้อมูลที่เลือกเท่านั้น

## สัญญาหน้าจอ

| ส่วน | พฤติกรรมที่ต้องรักษา |
|---|---|
| โครงหลัก | Map first; header 48 px; แผงขวา `min(max(300px,28%),440px)` มี breadcrumb บนสุด; ถาดกราฟย่อ 52 px |
| แถบเครื่องมือ | ดูทั้งหมด · กรุงเทพฯ · ย่าน (toggle) · 3D (toggle) · มุมสถาปนิก (toggle; กดอยู่เป็นค่าเริ่มต้นที่ระดับสถานที่, ปิดใช้ในระดับอื่นและใน 2D) · วิธีใช้ · ข้อมูล (มือถือ) |
| มือถือแนวตั้ง | แผนที่เต็มจอ; bottom sheet ≤ 64dvh; Aha ย่อบนแผนที่ (มี breadcrumb) เมื่อแผงปิด; เลือกย่านขณะ sheet เปิดใช้กรอบ 2D แล้วปรับ 3D เมื่อปิด sheet; ระดับสถานที่ใช้มุมโมเดลขณะ sheet เปิด แล้วจัดกรอบด้วยมุมสถาปนิกเมื่อปิด sheet; breadcrumb 4 ระดับพับเป็น “…” |
| หมุด | หนึ่งหมุดต่อรายการ; ขนาด 3 ระดับตาม zoom (<12, 12–14, ≥14); context dots สีเทา |
| โลโก้ | เฉพาะ zoom ≥ 14 และเฉพาะรายการใน focus; ≤ 250; ไม่ทับหมุด ป้าย หรือ UI |
| ป้ายย่าน | ชื่อ + ตัวนับแบรนด์; กดได้; quiet เมื่ออยู่นอก focus; ซ่อน < zoom 11.5 |
| คำอธิบายแผนที่ | ช่วงค่า choropleth, หมุด, อาคารที่ตั้ง, อาคารโฟกัส/บริบท (ซ่อนบริบทเมื่อ 2D), สีประเภท; ซ่อนช่วงค่าเมื่อ zoom ≥ 14.5 |
| ตาราง | overlay เหนือถาดกราฟ, คอลัมน์ย่าน จังหวัด (ชื่อไทย) สถานะจริง, ลิงก์หลักฐาน, ไม่มี CSV |
| ข้อความ | ไม่มี caveat banner, research badge, workflow residue; คงสถานะปิดจริง วันที่ แหล่งข้อมูล หน่วยนับ |
| Dev hook | `window.__citymeter` (state, map, update, fitMap, fitPitched, applyPreset, buildMapStyle) สำหรับจูนสดใน console; ไม่ใช่ API |

## ภาษาภาพและ LDS

LDS **0.9.7 / v0.9.7-owner.1**, `standalone-0.9.7-r1`, normative SHA-256 `d3085cbc0a50195f1cbf0c77b1d77c0d19b84364daf2948eb367348d65432d96` ค่าที่ใช้จริงอยู่ใน `assets/theme.css` (foundation pairs, semantic states, map roles, data states, series 1–10, count classes, **basemap-only tokens**) และ `js/scales.js` (LUT 41 ค่าของ `count`)

หัวเรื่อง Arvo / IBM Plex Sans Thai Looped 700, เนื้อหา Bai Jamjuree 400/600, ตัวเลข JetBrains Mono tabular, ไอคอน Material Symbols Rounded nav-7 FILL 0 / wght 300 (ปุ่ม 3D/มุมสถาปนิกใช้ข้อความ เพราะไม่มี glyph ที่อนุมัติ) ไม่มี decorative bracket หรือ colored left rail คง focus ring ธีม auto/light/dark ไม่เปลี่ยนความหมายข้อมูล Location-Intelligence-Profile ไม่นำมาใช้ (ไม่มีเมตริกธุรกิจในชุดนี้)

## ที่มาของเจตนาผลิตภัณฑ์

[Product Statement](../PRODUCT_STATEMENT.md) ตามโครง Who → What → Which → How ของ Landometer Master Brand Brief v0.5.3 §7.2 และ CityMETER Product Brief v6 §1.6 รายละเอียดข้อมูลอ่าน [DATA_METHOD.md](../DATA_METHOD.md) และ [วิธีนิยามย่าน](../docs/NEIGHBORHOOD_METHOD.md) เอกสาร handoff ไม่เผยแพร่ brief ภายในฉบับเต็ม ลิงก์ Drive/Sheet ภายใน หรือสิทธิ์ใช้งานเพิ่มเติม
