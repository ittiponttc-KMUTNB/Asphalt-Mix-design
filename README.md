# HMA Mix Design (Marshall Method)

โปรแกรมออกแบบส่วนผสมแอสฟัลต์คอนกรีต (Hot-Mix Asphalt) ด้วยวิธี **Marshall Mix Design** ตามมาตรฐานกรมทางหลวง **ทล.-ม. 408/2532** พร้อมอ้างอิงแนวทาง AASHTO T245 / ASTM D6927 ทำงานแบบ **ออฟไลน์ล้วน** ไม่ต้องพึ่งอินเทอร์เน็ต ไม่มีขั้นตอน build ใดๆ (Vanilla HTML/CSS/JavaScript)

## คุณสมบัติหลัก

1. **ข้อมูลโครงการ** — ตั้งค่าชั้นทาง (Wearing/Binder/Base/Shoulder) พร้อมเกณฑ์ควบคุมที่ปรับได้ตามสัญญาจ้าง
2. **ออกแบบขนาดคละมวลรวม** — Cold Bin / Hot Bin พร้อมกราฟ 0.45 Power Chart เทียบกับช่วงมาตรฐาน และ Tolerant Gradation
3. **คุณสมบัติมวลรวม/ยาง** — Bulk/Apparent/Effective Specific Gravity, ผลทดสอบคุณภาพมวลรวม
4. **ข้อมูล Marshall Specimen** — กรอกน้ำหนักตัวอย่าง/load/flow คำนวณ Gmb, Va, VMA, VFA, Stability (พร้อม correction factor), Flow อัตโนมัติ
5. **ผลลัพธ์และ OAC** — กราฟ 6 เส้น พร้อม curve fitting, หา Optimum Asphalt Content ตามวิธี Asphalt Institute (MS-2), ตรวจเกณฑ์อัตโนมัติ
6. **รายงาน / Export** — รูปแบบ Job-Mix Formula ครบ 4 หน้า พิมพ์/Export PDF, Export/Import โปรเจกต์เป็นไฟล์ JSON

สูตรคำนวณได้ตรวจสอบความถูกต้องเทียบกับผลออกแบบจริงของกรมทางหลวง (วช.P-AC/245/2568) แล้ว

## วิธีใช้งาน

เปิดไฟล์ `index.html` ด้วยเบราว์เซอร์ได้โดยตรง หรือรันเซิร์ฟเวอร์เฉพาะที่เพื่อประสบการณ์ที่ดีที่สุด:

```bash
python -m http.server 8532
```

แล้วเปิด `http://localhost:8532`

ข้อมูลโปรเจกต์จะถูกบันทึกอัตโนมัติไว้ใน localStorage ของเบราว์เซอร์ และสามารถ Export เป็นไฟล์ JSON เพื่อสำรอง/ย้ายเครื่องได้จากแท็บ "รายงาน / Export"

## โครงสร้างโปรเจกต์

```
index.html
css/style.css
js/
  app.js                  # state + navigation
  demo-project.js         # ชุดข้อมูลตัวอย่างอ้างอิง
  storage.js               # save/load/export/import
  data/doh-408-2532.js     # ตารางมาตรฐาน (ค่าเริ่มต้น แก้ไขได้)
  modules/                 # สูตรคำนวณ (calculations, oac, gradation)
  charts/chart-helpers.js  # wrapper รอบ Chart.js
  tabs/                    # UI แต่ละแท็บ
lib/                        # Chart.js, jsPDF, html2canvas (vendored, offline)
```

## หมายเหตุ

- ค่ามาตรฐานทั้งหมดเป็น "ค่าเริ่มต้น" ที่แก้ไขได้ในโปรแกรม เนื่องจากมาตรฐานอาจมีฉบับปรับปรุง หรือสัญญาจ้างอาจกำหนดเกณฑ์ที่เข้มกว่า
- ชุดข้อมูลตัวอย่าง (ปุ่ม "โหลดตัวอย่างอ้างอิง") สร้างจากรายงานผลออกแบบจริง ใช้เพื่อสาธิตและตรวจสอบความถูกต้องของสูตรคำนวณ
