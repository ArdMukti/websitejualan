DANE STORE — Vercel + Neon

Urutan deploy:
1. Upload isi folder ini ke root repository GitHub.
2. Di Vercel: Add New Project > Import repository.
3. Root Directory: ./
4. Framework Preset: Other.
5. Build Command: kosong.
6. Output Directory: kosong.
7. Deploy.
8. Setelah project dibuat, Vercel > Storage > Add > Neon/Postgres integration.
9. Hubungkan database ke Production.
10. Tambahkan Environment Variables:
   DATABASE_URL = otomatis dari Neon jika tersedia
   ADMIN_USERNAME = admin
   ADMIN_PASSWORD = password admin kamu
   SESSION_SECRET = string acak panjang
11. Redeploy setelah environment variables berubah.

Jangan pernah memasukkan DATABASE_URL ke kode frontend atau GitHub.
