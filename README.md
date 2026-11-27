# Navora Digital — Kartu Profil Digital & ID Card QR

Aplikasi web untuk pembuatan kartu profil digital berbasis **QR Code** dengan registrasi mandiri client dan dashboard admin real-time menggunakan **Firebase (Firestore & Authentication)**.

## Fitur Utama
- **Landing Page & Registrasi Mandiri (`index.html`)**: Client mengisi data diri, mengunggah foto, melihat *Live Preview* kartu, dan langsung mendapatkan halaman web profil + QR Code otomatis.
- **Halaman Profil Digital (`profil.html?id=...`)**: Tampilan kartu lanyard digital lengkap dengan tombol WhatsApp, Email, media sosial, modal QR Code, dan ekspor kontak (`.vcf`).
- **Dashboard Admin (`admin.html`)**: Notifikasi real-time saat client mencapai tahap QR Code, manajemen data pelanggan (CRUD), cetak ID Card fisik (`@media print`), serta pencatatan pembayaran & serah terima.

## Struktur Folder
```text
profil/
├── index.html
├── profil.html
├── admin.html
├── .gitignore
├── firestore.rules
├── assets/img/
├── css/style.css
├── data/data.json
└── js/
    ├── config/firebase-config.js
    ├── services/db.js
    └── pages/
        ├── landing.js
        ├── profile.js
        └── admin.js
```

## Cara Menjalankan
1. Isi konfigurasi Firebase pada `js/config/firebase-config.js` (atau jalankan langsung dalam **Mode Demo Lokal**).
2. Jalankan server lokal (karena menggunakan ES Modules):
   ```bash
   npx serve .
   ```
3. Buka `index.html` untuk client atau `admin.html` untuk dashboard admin.
