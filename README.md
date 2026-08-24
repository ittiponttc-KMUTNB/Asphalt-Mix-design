# HMA Mix Design Analysis Tool (Marshall Method)

เครื่องมือวิเคราะห์ส่วนผสมแอสฟัลต์คอนกรีต (Hot-Mix Asphalt) ด้วยวิธี **Marshall Mix Design** ตามมาตรฐานกรมทางหลวง **ทล.-ม. 408/2532** พร้อมอ้างอิงแนวทาง AASHTO T245 / ASTM D6927 ออกแบบมาสำหรับ**งานวิจัย/วิเคราะห์ข้อมูลแลบ** (ไม่ใช่เอกสารราชการ) ทำงานแบบ**ออฟไลน์ล้วน** ไม่มีขั้นตอน build (Vanilla HTML/CSS/JavaScript)

## คุณสมบัติหลัก

### 1) วิเคราะห์ขนาดคละมวลรวม
- ใส่ % ผ่านตะแกรงได้หลายตัวอย่างเพื่อเทียบกันในกราฟเดียว (0.45 Power Chart)
- เทียบกับช่วงมาตรฐานตามชั้นทางที่เลือก พร้อมไฮไลต์ผ่าน/ไม่ผ่านรายตะแกรง
- Export กราฟเป็น **PNG** และตารางข้อมูลเป็น **CSV**

### 2) Marshall Test & Optimum Asphalt Content
- กรอกข้อมูล specimen ที่ %AC ต่างๆ (น้ำหนัก Air/SSD/Water, load, flow) — รองรับหน่วย Flow ทั้ง **มม.** และ **0.01"** ตามเครื่องมือแลบ
- คำนวณ Gmb, Air Voids, VMA, VFA, Stability (พร้อม correction factor ตามปริมาตรตัวอย่างอัตโนมัติ), Flow
- พล็อตกราฟ 6 เส้น พร้อม curve fitting, หา Optimum Asphalt Content (วิธี Asphalt Institute MS-2)
- ตรวจเกณฑ์อัตโนมัติ (แก้ไขค่าเกณฑ์เปรียบเทียบได้)
- ทดสอบ % Strength Index (ความคงทนต่อน้ำ) แบบไม่บังคับ
- Export กราฟแต่ละเส้นเป็น **PNG** และตารางผลลัพธ์เป็น **CSV**

สูตรคำนวณตรวจสอบความถูกต้องเทียบกับผลออกแบบจริงของกรมทางหลวง (วช.P-AC/245/2568) แล้ว — ดูปุ่ม "โหลดตัวอย่างอ้างอิง"

## วิธีใช้งาน

เปิดไฟล์ `index.html` ด้วยเบราว์เซอร์ได้โดยตรง หรือรันเซิร์ฟเวอร์เฉพาะที่:

```bash
python -m http.server 8532
```

แล้วเปิด `http://localhost:8532`

ข้อมูลจะถูกบันทึกอัตโนมัติไว้ใน localStorage ของเบราว์เซอร์ และสามารถบันทึก/นำเข้าเป็นไฟล์ `.json` เพื่อสำรองหรือย้ายเครื่องได้จากแถบด้านซ้าย

## โครงสร้างโปรเจกต์

```
index.html
css/style.css
js/
  app.js                  # state + navigation
  demo-project.js         # ชุดข้อมูลตัวอย่างอ้างอิง
  storage.js               # save/load/export/import (.json)
  export-utils.js          # export CSV / PNG
  data/doh-408-2532.js     # ตารางมาตรฐาน (ค่าเริ่มต้น แก้ไขได้)
  modules/                 # สูตรคำนวณ (calculations, oac, gradation)
  charts/chart-helpers.js  # wrapper รอบ Chart.js
  tabs/                     # gradation-tab.js, marshall-tab.js
lib/chart.umd.min.js        # Chart.js (vendored, offline)
```

## หมายเหตุ

- ค่ามาตรฐานทั้งหมดเป็น "ค่าเริ่มต้น" ที่แก้ไขได้ในโปรแกรม
- ชุดข้อมูลตัวอย่าง (ปุ่ม "โหลดตัวอย่างอ้างอิง") สร้างจากรายงานผลออกแบบจริง ใช้เพื่อสาธิตและตรวจสอบความถูกต้องของสูตรคำนวณ
