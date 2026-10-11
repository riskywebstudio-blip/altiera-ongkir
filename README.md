# ALTIERA — Backend Cek Ongkir (Biteship)

Serverless function kecil untuk `POST /api/ongkir`. Dipisah dari GitHub Pages karena
API key tidak boleh ada di frontend. Tidak ada dependensi npm — hanya Node 18+ (fetch bawaan).

## Struktur
- `api/ongkir.js` — endpoint cek ongkir (validasi, hitung berat, panggil Biteship, filter respons)
- `config.js` — berat produk & kemasan (WAJIB diisi dari timbangan)
- `.env.example` — daftar environment variables

## 1. Isi `config.js`
- `PRODUCT_WEIGHT_GRAM`: berat aktual 1 botol (botol + tutup) dalam gram, untuk ketiga produk.
- `PACKAGING_WEIGHT_GRAM`: berat kemasan per pesanan (dus, bubble wrap) dalam gram.
Selama nilainya `null`, endpoint menolak permintaan (HTTP 503). Tidak ada berat yang ditebak.

## 2. Ambil data dari Biteship
1. Daftar/masuk ke dashboard Biteship → **Settings → API** → salin API key.
2. Kode pos asal pengiriman (lokasi gudang/toko ALTIERA) → isi `BITESHIP_ORIGIN_POSTAL_CODE`.
3. Kode kurir yang ingin ditampilkan, dipisah koma (mis. `jne,sicepat,jnt`) → `BITESHIP_COURIERS`.
   Cek kode yang tersedia di endpoint **Courier API** Biteship, lalu pastikan kurir itu aktif di akun Anda.

## 3. Environment variables (Vercel)
Vercel → Project → **Settings → Environment Variables**:

| Nama | Isi |
|---|---|
| `BITESHIP_API_KEY` | API key dari dashboard Biteship |
| `BITESHIP_ORIGIN_POSTAL_CODE` | kode pos asal, 5 digit |
| `BITESHIP_COURIERS` | daftar kode kurir, mis. `jne,sicepat` |
| `ALLOWED_ORIGIN` | domain GitHub Pages Anda, mis. `https://namaanda.github.io` (tanpa `/` di akhir) |

Jangan pernah menaruh API key di file yang di-commit ke repository. `.env` juga jangan di-commit.

## 4. Deploy
1. Buat project baru di Vercel, pilih folder ini (`altiera-ongkir-backend`) sebagai root.
   Tidak perlu build command; Vercel mengenali folder `api/` sebagai serverless function.
2. Setelah deploy, catat URL dasarnya, mis. `https://altiera-ongkir.vercel.app`.
3. Tambahkan env variables di atas lalu **Redeploy** agar berlaku.

## 5. Hubungkan ke GitHub Pages
1. Di `checkout.js` (folder website), isi:
   ```js
   backendUrl: 'https://altiera-ongkir.vercel.app',
   ```
   tanpa `/` di akhir.
2. Commit & push ke repository GitHub Pages seperti biasa.
3. Pastikan `ALLOWED_ORIGIN` sama persis dengan domain tempat website dibuka. CORS hanya mengizinkan domain itu.

## 6. Uji endpoint (setelah deploy)
```bash
curl -X POST https://altiera-ongkir.vercel.app/api/ongkir \
  -H "Content-Type: application/json" \
  -d '{"productId":"prestige","qty":1,"destinationPostalCode":"61000"}'
```
- Respons `503` → config.js atau env variables belum lengkap.
- Respons `502` → penyedia menolak. Cek API key dan format header `Authorization` di dokumentasi Biteship.
- Respons `200` dengan `rates` → berhasil. Jika `rates` kosong, berarti tidak ada layanan untuk tujuan itu.

Catatan: nama field pada respons Biteship (`courier_name`, `courier_service_name`, `price`, dll.)
perlu dicocokkan dengan respons asli pada uji pertama. Mapping ada di bagian bawah `api/ongkir.js`.
