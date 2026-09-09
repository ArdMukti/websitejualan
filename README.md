# Minuman Sutomo

Vercel + Neon. Tema kuning tua/kayu.

Fitur:
- Produk dan stok
- Login/register
- Checkout tanpa alamat & nomor HP
- Pembayaran Cash atau Transfer
- Transfer: menunggu konfirmasi admin
- Admin dapat konfirmasi/tolak pembayaran
- Admin dapat menandai pesanan selesai
- Status pesanan customer
- Database Neon lama tetap digunakan; API melakukan migration otomatis pada tabel orders.

- Admin dapat mengganti QR DANA dari `admin.html`.
- QR DANA disimpan di Vercel Blob, URL-nya disimpan di tabel `payment_settings` pada Neon.
- Customer selalu mengambil QR DANA terbaru saat checkout/pesanan.
- Ukuran upload QR dibatasi 3 MB agar aman terhadap batas request server. Tambahkan `BLOB_READ_WRITE_TOKEN` pada Environment Variables Vercel. Token biasanya tersedia setelah Blob Storage dibuat/diaktifkan pada project.
