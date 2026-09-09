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

## Reset Pesanan Harian WITA

- Pesanan aktif otomatis diarsipkan ketika tanggal WITA-nya sudah lewat dari tanggal WITA saat request berlangsung.
- Reset bersifat lazy: karena Vercel serverless tidak selalu hidup terus, reset dijalankan pada request pertama setelah 00:00 WITA.
- Data lama disimpan di tabel baru `order_archives` sebagai snapshot JSONB sebelum data dari `orders` dihapus.
- Tabel `orders` dan `order_items` yang sudah ada tidak diubah strukturnya.
- Admin dapat melihat riwayat pesanan melalui menu **Riwayat**.
- Zona waktu yang dipakai adalah `Asia/Makassar` (WITA / UTC+8).
