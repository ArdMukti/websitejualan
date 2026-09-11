# Minuman Sutomo

Vercel + Neon. Frontend mengikuti desain referensi Minuman Sutomo dengan tema kuning/gold, kartu rounded, halaman auth, detail produk, keranjang, checkout, tracking pesanan, dan dashboard admin.

## Perbaikan checkout & status pesanan
- Memperbaiki alur `POST /api/orders` agar checkout tidak bergantung pada kolom tambahan `payment_status` / `payment_method`.
- Tidak menjalankan `ALTER TABLE` atau migrasi kolom pada database yang sudah ada.
- Metode pembayaran direpresentasikan dengan status awal:
  - Cash → **Belum Dibayar**
  - Transfer → **Transfer**
- Admin dapat mengubah status pesanan melalui dropdown:
  - **Belum Dibayar**
  - **Transfer**
  - **Proses**
  - **Selesai**
- Status pelanggan dan timeline pesanan mengikuti empat status tersebut.
- Endpoint lama `confirm`, `finish`, dan `reject` tetap didukung untuk kompatibilitas.

## Environment Vercel
Gunakan environment variable:
- `DATABASE_URL`
- `SESSION_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`


## Pembayaran QR DANA
- Database tetap memakai Neon `DATABASE_URL` yang sudah ada.
- Sistem otomatis membuat tabel `payment_settings` jika belum ada.
- Admin dapat upload/ganti/hapus foto QR DANA dari `admin.html`.
- Foto QR disimpan sebagai data gambar di tabel `payment_settings`, jadi tidak bergantung pada filesystem Vercel.
- Customer memilih `QR DANA` atau `Cash` saat checkout.
- Pesanan QR DANA masuk status `transfer` dan harus dikonfirmasi admin sebelum diproses.
- Tidak ada form alamat atau nomor HP.
