# ระบบสร้างข้อสอบออนไลน์และรายงานผลแบบ Real-time (Socrative Clone + Google Sheets Database)

โปรเจกต์นี้ออกแบบให้เหมือนกับ **Socrative** ครบทั้ง 3 หน้าหลักตามภาพตัวอย่าง พร้อมเชื่อมต่อ **Google Sheets** เป็นฐานข้อมูลอัตโนมัติ และรองรับการนำเข้าข้อสอบจากไฟล์ **Word (`.docx`)**, **PDF (`.pdf`)**, และ **Excel (`.xlsx` / `.csv`)**

---

## 📁 โครงสร้างไฟล์ในโปรเจกต์
- [index.html](file:///C:/Users/thanaty/.gemini/antigravity/scratch/socrative-quiz-app/index.html) — หน้าเว็บหลัก (รวมทั้งหน้าครูและหน้าทำข้อสอบผ่านมือถือของนักเรียน)
- [css/style.css](file:///C:/Users/thanaty/.gemini/antigravity/scratch/socrative-quiz-app/css/style.css) — ดีไซน์ UI สไตล์ Socrative ต้นฉบับ
- [js/app.js](file:///C:/Users/thanaty/.gemini/antigravity/scratch/socrative-quiz-app/js/app.js) — ระบบสร้างข้อสอบหลายชุด, สกัดข้อสอบจาก Word/PDF/Excel, สร้างข้อสอบด้วย AI และตารางผลสอบ Real-time
- [google-apps-script/Code.gs](file:///C:/Users/thanaty/.gemini/antigravity/scratch/socrative-quiz-app/google-apps-script/Code.gs) — โค้ดสำหรับนำไปวางใน Google Sheets เพื่อสร้างตารางฐานข้อมูลให้อัตโนมัติ
- [api.php](file:///C:/Users/thanaty/.gemini/antigravity/scratch/socrative-quiz-app/api.php) — ไฟล์ PHP Proxy เสริมสำหรับกรณีนำไปฝากบน PHP Web Hosting

---

## 🚀 วิธีเชื่อมต่อฐานข้อมูล Google Sheets (สร้างตารางอัตโนมัติ)

1. เปิดลิงก์ Google Sheets ของคุณ: https://docs.google.com/spreadsheets/u/0/ แล้วกดสร้างชีตว่างใหม่ (Blank spreadsheet)
2. ไปที่เมนูด้านบน **Extensions (ส่วนขยาย) > Apps Script**
3. ลบโค้ดเดิมในหน้าต่าง Apps Script ออกทั้งหมด แล้วคัดลอกโค้ดจากไฟล์ [Code.gs](file:///C:/Users/thanaty/.gemini/antigravity/scratch/socrative-quiz-app/google-apps-script/Code.gs) ไปวางแทนที่
4. กดปุ่ม **Save (รูปแผ่นดิสก์)**
5. เลือกฟังก์ชัน `setupDatabase` ที่แถบด้านบน แล้วกดปุ่ม **Run (เรียกใช้)** 1 ครั้ง (กดอนุญาตสิทธิ์ให้เรียบร้อย) — ระบบจะสร้างตาราง `Quizzes`, `Questions`, `Sessions`, `Responses` และสร้างแท็บแยกตามชื่อชุดข้อสอบให้อัตโนมัติทันที
6. กดปุ่มสีน้ำเงินมุมขวาบน **Deploy (ทำให้ใช้งานได้) > New deployment (การทำให้ใช้งานได้รายการใหม่)**:
   - คลิกไอคอนฟันเฟือง เลือกประเภท **Web app (เว็บแอป)**
   - ช่อง **Execute as (ดำเนินการในฐานะ)**: เลือก `Me (ฉัน)`
   - ช่อง **Who has access (ผู้ที่มีสิทธิ์เข้าถึง)**: เลือก `Anyone (ทุกคน)`
   - กด **Deploy** แล้วคัดลอก **Web App URL** ที่ได้
7. เปิดหน้าเว็บ [index.html](file:///C:/Users/thanaty/.gemini/antigravity/scratch/socrative-quiz-app/index.html) คลิกปุ่ม **"ตั้งค่า Google Sheet / AI"** ด้านบน แล้วนำ **Web App URL** ไปวางและกดบันทึกได้เลย!
