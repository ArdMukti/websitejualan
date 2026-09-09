# Minuman Sutomo

Vercel + Neon. Frontend diperbarui mengikuti desain referensi Minuman Sutomo dengan tema kuning/gold, kartu rounded, halaman auth, detail produk, keranjang, checkout, tracking pesanan, dan dashboard admin.

## Perubahan
- Redesign UI tanpa mengubah struktur atau isi database.
- `api/index.js` tidak diubah; seluruh endpoint/database yang sudah ada tetap dipakai.
- Tambah `produk.html` + `produk.js` untuk detail produk.
- Tambah `checkout.html` + `checkout.js` untuk alur checkout terpisah.
- Keranjang, status pesanan, login/register, dan admin disesuaikan dengan tampilan referensi.
- Responsive untuk desktop dan mobile.
- Data produk, stok, user, dan pesanan tetap berasal dari API/Neon yang sudah ada.

## Environment Vercel
Tetap gunakan environment variable yang sebelumnya:
- `DATABASE_URL`
- `SESSION_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
