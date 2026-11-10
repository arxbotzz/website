# Scrapr Web Downloader

Website ekstraksi media menggunakan @coflyn/scrapr.

## Persyaratan
- Termux
- Node.js
- Koneksi internet

## Instalasi
```bash
npm install
npm start
```

Buka http://127.0.0.1:3000

## Konfigurasi
PORT dapat diubah melalui environment variable.

## Catatan
- Maksimal 2 proses ekstraksi bersamaan.
- Rate limit 15 request per menit per IP.
- Link hasil ekstraksi dikirim ke browser; server tidak menjadi proxy file.
- Keberhasilan bergantung pada dukungan dan kondisi platform sumber.
- Gunakan hanya untuk konten yang boleh diakses dan diunduh.
- Untuk akses internet publik, gunakan reverse tunnel yang aman.
