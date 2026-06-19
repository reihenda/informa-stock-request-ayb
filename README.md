# Informa Stock Request System

Sistem request stok berbasis web untuk Informa Electronics Margonda.
Stack: Next.js 14 + Google Sheets API + Vercel

---

## Struktur Project

```
src/
├── app/
│   ├── page.tsx                        ← Form request (untuk sales)
│   ├── dashboard/page.tsx              ← Dashboard (untuk manager)
│   ├── layout.tsx
│   ├── globals.css
│   └── api/
│       ├── check-article/route.ts      ← Cek artikel + validasi
│       ├── submit-request/route.ts     ← Simpan ke Request Log
│       ├── get-display-requests/route.ts ← Simpan pengajuan display
│       └── get-requests/route.ts       ← Ambil semua data (dashboard)
└── lib/
    └── sheets.ts                       ← Google Sheets helper
```

---

## Setup Lokal

### 1. Install dependencies
```bash
npm install
```

### 2. Isi .env.local
Buka file `.env.local` dan isi nilai berikut dari:
- Google Sheets: ambil Spreadsheet ID dari URL
- Service Account JSON: buka file JSON yang didownload dari Google Cloud

```env
SPREADSHEET_ID=your_spreadsheet_id_here
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n"
```

> PENTING untuk GOOGLE_PRIVATE_KEY:
> - Buka file JSON service account
> - Copy nilai dari field "private_key"
> - Pastikan ada tanda kutip ganda di awal dan akhir di .env.local

### 3. Jalankan dev server
```bash
npm run dev
```

Buka http://localhost:3000

---

## Deploy ke Vercel

### 1. Push ke GitHub
```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/USERNAME/informa-stock-request.git
git push -u origin main
```

### 2. Connect ke Vercel
- Buka vercel.com
- Klik "Add New Project"
- Import repo dari GitHub
- Klik "Deploy" (belum perlu setting env dulu)

### 3. Tambah Environment Variables di Vercel
- Buka project di Vercel → Settings → Environment Variables
- Tambahkan satu per satu:
  - SPREADSHEET_ID
  - GOOGLE_SERVICE_ACCOUNT_EMAIL
  - GOOGLE_PRIVATE_KEY (paste termasuk -----BEGIN dan -----END nya)
- Klik "Save" → lalu "Redeploy"

---

## URL Setelah Deploy

| URL | Fungsi |
|-----|--------|
| / | Form request untuk sales |
| /dashboard | Dashboard untuk manager |

---

## Troubleshooting

**Error: "The caller does not have permission"**
→ Pastikan spreadsheet sudah di-share ke email service account dengan role Editor

**Error: "GOOGLE_PRIVATE_KEY is invalid"**
→ Pastikan private key di .env.local atau Vercel menggunakan tanda kutip ganda dan ada \n di setiap line break

**Artikel tidak ditemukan padahal ada di sheet**
→ Cek konsistensi huruf besar/kecil di Article Code antara sheet 1 dan 2
