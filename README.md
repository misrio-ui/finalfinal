# Deezer Music Player

เว็บค้นหาและเล่นตัวอย่างเพลง Deezer ที่ใช้ React + Vite ฝั่งหน้าเว็บ และ Express API proxy ฝั่งเซิร์ฟเวอร์

## ฟีเจอร์

- ค้นหาแยกตามแท็บ: เพลงค้นจาก `search/track`, นักร้องจาก `search/artist`, และอัลบั้มจาก `search/album`
- แสดงผลสูงสุด 100 รายการตามทุก endpoint ที่รองรับ
- เรียงยอดนิยมสองทาง: มากไปน้อยและน้อยไปมาก
- เล่น preview 30 วินาที พร้อมแผ่นเสียง แทบ timeline และควบคุมระดับเสียง
- จำระดับเสียงและรายการ Favorites ด้วย `localStorage`
- เปิดมุมมอง Favorites และค้นหาเฉพาะในรายการที่ถูกใจ
- แสดง loading, empty, success และ error state

## สถาปัตยกรรม

```text
React/Vite UI
  -> /api/deezer/*
  -> Express proxy: validation, limit, timeout, normalization, TTL cache
  -> Deezer API
```

โครงสร้างแยก frontend และ backend:

```text
frontend/
  src/
  index.html
  vite.config.js
  dist/
backend/
  server.js
```

Vite build อยู่ใน `frontend/dist/`

## Component Tree

```text
App
├── Header
│   ├── FilterNavigation
│   ├── SearchBox
│   └── FavoritesButton
├── ContentPanel
│   ├── Status
│   ├── SongCard
│   ├── AlbumCard
│   └── ArtistCard
└── PlayerPanel
    ├── SongDetails
    └── AudioControls
```

โค้ด component ที่แยกจริงอยู่ใน [frontend/src/components/](frontend/src/components/) โดย `App.jsx` เป็นส่วน orchestration ของ state และ API calls

ไฟล์ component สำคัญ:

- `Header.jsx`, `SearchBox.jsx`, `FavoritesButton.jsx`
- `ContentPanel.jsx`, `Status.jsx`, `SongCard.jsx`, `AlbumCard.jsx`, `ArtistCard.jsx`
- `PlayerPanel.jsx`

## DSA และ Big-O

| โครงสร้าง/ขั้นตอน | การใช้งาน | ความซับซ้อน | หลักฐาน |
|---|---|---:|---|
| `Map` index เพลง | เลือกเพลงและเลื่อนก่อนหน้า/ถัดไปด้วย ID | Lookup `O(1)` โดยเฉลี่ย | `frontend/src/App.jsx` ฟังก์ชัน `indexSongs`, `selectSong` |
| `Map` index Favorites | ตรวจและอัปเดตเพลงที่ถูกใจด้วย ID โดยไม่ใช้ `.some()` | Lookup/insert/delete เฉลี่ย `O(1)` | state `favoriteIndex` และฟังก์ชัน `toggleFavorite` ใน `frontend/src/App.jsx`; ปุ่มหัวใจใน `PlayerPanel.jsx` |
| `Map` อัลบั้ม | รวมอัลบั้มไม่ซ้ำจากชาร์ต | `O(n)` โดยเฉลี่ย | `frontend/src/App.jsx` ฟังก์ชัน `loadAlbums` |
| `Array.sort()` | เรียงยอดนิยมมากไปน้อย/น้อยไปมาก | `O(n log n)` โดยเฉลี่ย | `frontend/src/App.jsx` ฟังก์ชัน `sortSongs` |
| Debounce | รอการพิมพ์ 500 ms ก่อนค้นหา | ลด API calls ระหว่างการพิมพ์ | `searchTimer` ใน `frontend/src/App.jsx` |
| TTL cache ใน Express | Cache response ด้วย URL เป็น key เป็นเวลา 60 วินาทีและลบ entry ที่หมดอายุอัตโนมัติ | Lookup/lazy cleanup ลำดับเฉลี่ย `O(1)` ต่อ cache entry | `responseCache` และฟังก์ชัน `cleanupExpiredCache` ใน `backend/server.js` |

ตัวเลข Big-O เป็นค่าประมาณ Map lookup จะเป็น average-case ไม่ใช่ worst-case และ JavaScript engine ของ `.sort()` มีขั้นตอนประมาณ `O(n log n)`

## Before → After และหลักฐานข้อเสนอแนะจากงานแรก

| ที่มา | ข้อเสนอแนะ/แนวคิด | ก่อนพัฒนา | หลังพัฒนา | หลักฐานในโค้ด |
|---|---|---|---|---|
| อาจารย์แนะนำจากงานแรก | เพิ่ม `package.json` สำหรับ Express | ยังไม่มี `backend/package.json` แยกกำหนด dependency และคำสั่ง backend | เพิ่ม `backend/package.json` ระบุ Express dependency และคำสั่ง `start`/`dev` | `backend/package.json` |
| อาจารย์แนะนำจากงานแรก | ปรับการค้นหา ไม่ให้ค้นหาได้เฉพาะ Top list | หน้าหลักเน้นแสดง Top list | ค้นหาเพลง นักร้อง และอัลบั้มผ่าน Deezer search endpoints แยกตามประเภท | `frontend/src/App.jsx` ฟังก์ชัน `loadSongs`, `loadArtists`, `loadAlbums` |
| ทีมคิดเพิ่มเพื่อ UX | เพิ่มปุ่มถูกใจ | ยังไม่มีการบันทึกรายการเพลงโปรด | เพิ่มปุ่ม Favorite และเก็บรายการไว้ใน `localStorage` | `frontend/src/components/PlayerPanel.jsx`, `frontend/src/App.jsx` ฟังก์ชัน `toggleFavorite` |
| ทีมคิดเพิ่มเพื่อ UX | เพิ่มปุ่มย้อนกลับ | ไม่มีปุ่มย้อนกลับภายใน navigation ของแอป | เพิ่มปุ่มย้อนกลับและจัดการ navigation history เพื่อกลับไปมุมมองก่อนหน้า | `frontend/src/components/Header.jsx`, `frontend/src/App.jsx` ฟังก์ชัน `navigateTo` และ `restoreNavigation` |

## สถานะ UI

- Loading: วงหมุน “กำลังโหลดข้อมูล”
- Empty: ไม่พบข้อมูลหรือ Favorites ว่าง
- Error: แสดงข้อความจาก Express/Deezer API
- Success: แสดง card ของเพลง อัลบั้ม หรือนักร้อง

## การติดตั้งและรัน

Node.js 20.19.0 หรือใหม่กว่า (Vite 7 ต้องการ Node.js เวอร์ชันนี้)

```powershell
npm.cmd install
npm.cmd run build
npm.cmd start
```

เปิด `http://localhost:3000`

สำหรับพัฒนา:

```powershell
npm.cmd run dev
```

## Deploy บน Vercel

Import repository นี้เข้า Vercel แล้วตั้งค่าโปรเจกต์ดังนี้:

- **Root Directory:** `./` (โฟลเดอร์หลักที่มี `package.json` และ `vercel.json` ไม่ใช่ `backend/` หรือ `frontend/`)
- **Framework Preset:** `Other`
- **Build Command:** `npm run build`
- **Output Directory:** `frontend/dist`
- **Install Command:** ใช้ค่าเริ่มต้นของ Vercel (`npm install`)
- **Environment Variables:** ไม่ต้องกำหนด

คำสั่ง build ที่ root ระบุ workspace ของ frontend โดยตรง จึงไม่เรียก `build` ของ backend ส่วน Express API ถูกนำมาใช้ซ้ำเป็น Vercel Function ผ่าน `api/[...path].js`; frontend เรียก API ผ่าน `/api/...` บน origin เดียวกัน จึงไม่ต้องตั้งค่า CORS หรือเปิดเผย API key. `npm run dev` ยังคงรัน frontend และ Express backend แยกกันในเครื่องเหมือนเดิม.

ทดสอบ API:

- Health check: `http://localhost:3000/api/health`
- Chart 100 รายการ: `http://localhost:3000/api/deezer/chart/0/tracks?limit=100`
- ค้นหาเพลง: `http://localhost:3000/api/deezer/search/track?q=test&limit=100`

## ตารางความรับผิดชอบ

| ชื่อ-สกุล | รหัสนักศึกษา | ชิ้นงานที่รับผิดชอบ (ไฟล์ / component / route / DSA) | ช่วงที่นำเสนอในคลิป |
|---|---|---|---|
| นางสาวชฎาพร สุวรรณรัตน์ | 681310005 | เปิดคลิป, อธิบายข้อเสนอแนะจากงานแรกและ Before/After, ร่วมอธิบาย DSA | 0.03-0.34, 0.54-1.25, 1.39-1.47, 4.09-4.22, 4.54-5.01 |
| นายธนกฤต เจียมจงวัฒนา | 681310639 | สาธิต React/UX, อธิบายการค้นหาและฟีเจอร์ที่ทีมเพิ่ม, ร่วมอธิบาย DSA ฝั่ง React | 0.43-0.48, 1.26-1.38, 1.48-2.33, 3.51-4.08 |
| นางสาวอรพรรณ มีศรี | 681310649 | อธิบาย Architecture/Express, ร่วมอธิบาย DSA ฝั่ง cache และสรุปผลงาน | 0.36-0.40, 0.49-0.53, 2.35-3.50, 4.23-4.43, 5.02-5.34 |
