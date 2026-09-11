const { neon } = require("@neondatabase/serverless");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const sql = () => neon(process.env.DATABASE_URL);

const send = (res, code, data) => {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
};

const read = (req) =>
  new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Body JSON tidak valid."));
      }
    });

    req.on("error", reject);
  });

function sign(payload) {
  const raw = Buffer.from(JSON.stringify(payload)).toString("base64url");

  const sig = crypto
    .createHmac("sha256", process.env.SESSION_SECRET)
    .update(raw)
    .digest("base64url");

  return `${raw}.${sig}`;
}

function getUser(req) {
  try {
    const match = (req.headers.cookie || "").match(/dane=([^;]+)/);

    if (!match) return null;

    const [raw, sig] = decodeURIComponent(match[1]).split(".");

    const expected = crypto
      .createHmac("sha256", process.env.SESSION_SECRET)
      .update(raw)
      .digest("base64url");

    if (!sig || sig !== expected) return null;

    const payload = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf8")
    );

    return payload.exp > Date.now() ? payload : null;
  } catch {
    return null;
  }
}

let ready = false;

async function setup() {
  if (ready) return;

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL belum diatur di Vercel.");
  }

  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET belum diatur di Vercel.");
  }

  const q = sql();

  await q`
    CREATE TABLE IF NOT EXISTS users(
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer'
    )
  `;

  await q`
    CREATE TABLE IF NOT EXISTS products(
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      price INTEGER NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      image TEXT DEFAULT '',
      category TEXT DEFAULT ''
    )
  `;

  await q`
    CREATE TABLE IF NOT EXISTS orders(
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      customer_name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      total INTEGER NOT NULL,
      status TEXT DEFAULT 'belum_dibayar',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await q`
    CREATE TABLE IF NOT EXISTS order_items(
      id SERIAL PRIMARY KEY,
      order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER,
      name TEXT,
      price INTEGER,
      quantity INTEGER
    )
  `;

  await q`
    CREATE TABLE IF NOT EXISTS payment_settings(
      id INTEGER PRIMARY KEY,
      dana_qr_url TEXT DEFAULT '',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await q`
    INSERT INTO payment_settings(id, dana_qr_url)
    VALUES(1, '')
    ON CONFLICT (id) DO NOTHING
  `;

  const adminUsername = process.env.ADMIN_USERNAME || "admin";
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    throw new Error("ADMIN_PASSWORD belum diatur di Vercel.");
  }

  const existing = await q`
    SELECT id
    FROM users
    WHERE username=${adminUsername}
    LIMIT 1
  `;

  if (!existing.length) {
    const hash = await bcrypt.hash(adminPassword, 10);

    await q`
      INSERT INTO users(username, password, role)
      VALUES(${adminUsername}, ${hash}, 'admin')
    `;
  }

  ready = true;
}

const STATUS = new Set([
  "belum_dibayar",
  "transfer",
  "proses",
  "selesai"
]);

const statusLabel = {
  belum_dibayar: "Belum Dibayar",
  transfer: "Transfer",
  proses: "Proses",
  selesai: "Selesai"
};

module.exports = async (req, res) => {
  try {
    await setup();

    const pathname =
      new URL(req.url, "https://sutomo.local")
        .pathname
        .replace(/^\/api/, "") || "/";

    const q = sql();
    const user = getUser(req);

    // =========================
    // PRODUCTS
    // =========================

    if (req.method === "GET" && pathname === "/products") {
      return send(
        res,
        200,
        await q`
          SELECT *
          FROM products
          ORDER BY id DESC
        `
      );
    }

    // =========================
    // CURRENT USER
    // =========================

    if (req.method === "GET" && pathname === "/me") {
      return send(res, 200, { user });
    }

    // =========================
    // PAYMENT SETTINGS
    // =========================

    if (
      req.method === "GET" &&
      pathname === "/payment-settings"
    ) {
      const rows = await q`
        SELECT dana_qr_url
        FROM payment_settings
        WHERE id=1
        LIMIT 1
      `;

      return send(res, 200, {
        danaQrUrl: rows[0]?.dana_qr_url || ""
      });
    }

    // =========================
    // REGISTER
    // =========================

    if (
      req.method === "POST" &&
      pathname === "/register"
    ) {
      const body = await read(req);

      if (
        !body.username ||
        !body.password ||
        body.password.length < 6
      ) {
        return send(res, 400, {
          error: "Password minimal 6 karakter."
        });
      }

      try {
        const hash = await bcrypt.hash(body.password, 10);

        const rows = await q`
          INSERT INTO users(username, password)
          VALUES(${body.username}, ${hash})
          RETURNING id, username, role
        `;

        return send(res, 201, {
          user: rows[0]
        });
      } catch {
        return send(res, 409, {
          error: "Username sudah digunakan."
        });
      }
    }

    // =========================
    // LOGIN
    // =========================

    if (
      req.method === "POST" &&
      pathname === "/login"
    ) {
      const body = await read(req);

      const rows = await q`
        SELECT *
        FROM users
        WHERE username=${body.username}
        LIMIT 1
      `;

      if (
        !rows.length ||
        !(await bcrypt.compare(
          body.password || "",
          rows[0].password
        ))
      ) {
        return send(res, 401, {
          error: "Login gagal."
        });
      }

      const cookie = sign({
        id: rows[0].id,
        username: rows[0].username,
        role: rows[0].role,
        exp: Date.now() + 604800000
      });

      res.setHeader(
        "Set-Cookie",
        `dane=${encodeURIComponent(
          cookie
        )}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`
      );

      return send(res, 200, {
        user: {
          id: rows[0].id,
          username: rows[0].username,
          role: rows[0].role
        }
      });
    }

    // =========================
    // LOGOUT
    // =========================

    if (
      req.method === "POST" &&
      pathname === "/logout"
    ) {
      res.setHeader(
        "Set-Cookie",
        "dane=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax"
      );

      return send(res, 200, {
        ok: true
      });
    }

    // =========================
    // CREATE ORDER
    // =========================

    if (
      req.method === "POST" &&
      pathname === "/orders"
    ) {
      if (!user) {
        return send(res, 401, {
          error: "Login diperlukan."
        });
      }

      const body = await read(req);

      if (
        !Array.isArray(body.items) ||
        !body.items.length
      ) {
        return send(res, 400, {
          error: "Keranjang kosong."
        });
      }

      // Ambil username langsung dari database.
      // Tidak menggunakan customerName dari checkout.
      const customerRows = await q`
        SELECT id, username
        FROM users
        WHERE id=${user.id}
        LIMIT 1
      `;

      if (
        !customerRows.length ||
        !customerRows[0].username
      ) {
        return send(res, 401, {
          error:
            "Data akun tidak ditemukan. Silakan logout lalu login kembali."
        });
      }

      const customerName =
        String(customerRows[0].username).trim();

      const payment =
        body.paymentMethod === "transfer"
          ? "transfer"
          : "cash";

      const ids = [
        ...new Set(
          body.items
            .map((item) => Number(item.id))
            .filter(Number.isInteger)
        )
      ];

      if (!ids.length) {
        return send(res, 400, {
          error: "Produk tidak valid."
        });
      }

      const products = await q`
        SELECT *
        FROM products
        WHERE id = ANY(${ids})
      `;

      let total = 0;

      const normalized = [];

      for (const item of body.items) {
        const product = products.find(
          (p) => p.id === Number(item.id)
        );

        const qty = Number(item.qty);

        if (!product) {
          return send(res, 400, {
            error: "Produk tidak ditemukan."
          });
        }

        if (
          !Number.isInteger(qty) ||
          qty < 1
        ) {
          return send(res, 400, {
            error: `Jumlah ${product.name} tidak valid.`
          });
        }

        if (product.stock < qty) {
          return send(res, 400, {
            error: `Stok ${product.name} tidak mencukupi.`
          });
        }

        total += product.price * qty;

        normalized.push({
          product,
          qty
        });
      }

      /*
        Cash:
        status = belum_dibayar

        QR DANA:
        status = transfer

        Alamat dan nomor HP tidak diminta.
        Namun database lama masih memiliki kolom tersebut,
        sehingga kita kirim string kosong, bukan NULL.
      */

      const initialStatus =
        payment === "transfer"
          ? "transfer"
          : "belum_dibayar";

      const orderRows = await q`
        INSERT INTO orders(
          user_id,
          customer_name,
          phone,
          address,
          total,
          status
        )
        VALUES(
          ${user.id},
          ${customerName},
          ${""},
          ${""},
          ${total},
          ${initialStatus}
        )
        RETURNING id, total, status
      `;

      const order = orderRows[0];

      for (const item of normalized) {
        await q`
          INSERT INTO order_items(
            order_id,
            product_id,
            name,
            price,
            quantity
          )
          VALUES(
            ${order.id},
            ${item.product.id},
            ${item.product.name},
            ${item.product.price},
            ${item.qty}
          )
        `;

        await q`
          UPDATE products
          SET stock = stock - ${item.qty}
          WHERE id = ${item.product.id}
        `;
      }

      return send(res, 201, {
        orderId: order.id,
        total,
        status: order.status,
        paymentMethod: payment
      });
    }

    // =========================
    // GET ORDERS
    // =========================

    if (
      req.method === "GET" &&
      pathname === "/orders"
    ) {
      if (!user) {
        return send(res, 401, {
          error: "Login diperlukan."
        });
      }

      const orders =
        user.role === "admin"
          ? await q`
              SELECT *
              FROM orders
              ORDER BY id DESC
            `
          : await q`
              SELECT *
              FROM orders
              WHERE user_id=${user.id}
              ORDER BY id DESC
            `;

      for (const order of orders) {
        order.items = await q`
          SELECT *
          FROM order_items
          WHERE order_id=${order.id}
        `;

        if (!order.payment_method) {
          order.payment_method =
            order.status === "transfer"
              ? "transfer"
              : "cash";
        }
      }

      return send(res, 200, orders);
    }

    // =========================
    // ADMIN UPDATE ORDER STATUS
    // =========================

    if (
      ["POST", "PUT", "PATCH"].includes(req.method) &&
      pathname.startsWith("/admin/orders/")
    ) {
      if (
        !user ||
        user.role !== "admin"
      ) {
        return send(res, 403, {
          error: "Akses admin diperlukan."
        });
      }

      const parts = pathname.split("/");

      const id = Number(parts[3]);

      if (!Number.isInteger(id)) {
        return send(res, 400, {
          error: "ID pesanan tidak valid."
        });
      }

      const found = await q`
        SELECT *
        FROM orders
        WHERE id=${id}
        LIMIT 1
      `;

      if (!found.length) {
        return send(res, 404, {
          error: "Pesanan tidak ditemukan."
        });
      }

      const action = parts[4];

      // /admin/orders/:id/status
      if (action === "status") {
        const body = await read(req);

        const status = String(
          body.status || ""
        );

        if (!STATUS.has(status)) {
          return send(res, 400, {
            error: "Status tidak valid."
          });
        }

        await q`
          UPDATE orders
          SET status=${status}
          WHERE id=${id}
        `;

        return send(res, 200, {
          ok: true,
          status,
          label: statusLabel[status]
        });
      }

      // Endpoint lama: /admin/orders/:id/confirm
      if (action === "confirm") {
        await q`
          UPDATE orders
          SET status='proses'
          WHERE id=${id}
        `;

        return send(res, 200, {
          ok: true,
          status: "proses"
        });
      }

      // Endpoint lama: /admin/orders/:id/finish
      if (action === "finish") {
        await q`
          UPDATE orders
          SET status='selesai'
          WHERE id=${id}
        `;

        return send(res, 200, {
          ok: true,
          status: "selesai"
        });
      }

      // Endpoint lama: /admin/orders/:id/reject
      if (action === "reject") {
        const order = found[0];

        if (order.status !== "selesai") {
          const items = await q`
            SELECT *
            FROM order_items
            WHERE order_id=${id}
          `;

          for (const item of items) {
            await q`
              UPDATE products
              SET stock = stock + ${item.quantity}
              WHERE id = ${item.product_id}
            `;
          }
        }

        await q`
          UPDATE orders
          SET status='belum_dibayar'
          WHERE id=${id}
        `;

        return send(res, 200, {
          ok: true,
          status: "belum_dibayar"
        });
      }

      return send(res, 400, {
        error: "Aksi tidak dikenal."
      });
    }

    // =========================
    // COMPATIBILITY STATUS URL
    // /orders/:id/status
    // =========================

    if (
      ["POST", "PUT", "PATCH"].includes(req.method) &&
      pathname.startsWith("/orders/") &&
      pathname.endsWith("/status")
    ) {
      if (
        !user ||
        user.role !== "admin"
      ) {
        return send(res, 403, {
          error: "Akses admin diperlukan."
        });
      }

      const parts = pathname.split("/");

      const id = Number(parts[2]);

      if (!Number.isInteger(id)) {
        return send(res, 400, {
          error: "ID pesanan tidak valid."
        });
      }

      const body = await read(req);

      const status = String(
        body.status || ""
      );

      if (!STATUS.has(status)) {
        return send(res, 400, {
          error: "Status tidak valid."
        });
      }

      const found = await q`
        SELECT id
        FROM orders
        WHERE id=${id}
        LIMIT 1
      `;

      if (!found.length) {
        return send(res, 404, {
          error: "Pesanan tidak ditemukan."
        });
      }

      await q`
        UPDATE orders
        SET status=${status}
        WHERE id=${id}
      `;

      return send(res, 200, {
        ok: true,
        status,
        label: statusLabel[status]
      });
    }

    // =========================
    // ADMIN QR DANA
    // =========================

    if (
      req.method === "PUT" &&
      pathname === "/admin/payment-settings"
    ) {
      if (
        !user ||
        user.role !== "admin"
      ) {
        return send(res, 403, {
          error: "Akses admin diperlukan."
        });
      }

      const body = await read(req);

      const value = String(
        body.danaQrUrl || ""
      ).trim();

      if (value.length > 3500000) {
        return send(res, 400, {
          error:
            "Ukuran gambar QR terlalu besar. Gunakan gambar maksimal sekitar 2 MB."
        });
      }

      if (
        value &&
        !/^https?:\/\//i.test(value) &&
        !/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(
          value
        )
      ) {
        return send(res, 400, {
          error:
            "QR harus berupa URL gambar atau file gambar PNG/JPG/WEBP."
        });
      }

      await q`
        UPDATE payment_settings
        SET
          dana_qr_url=${value},
          updated_at=NOW()
        WHERE id=1
      `;

      return send(res, 200, {
        ok: true
      });
    }

    // =========================
    // DELETE ALL ORDERS
    // =========================

    if (
      req.method === "DELETE" &&
      pathname === "/admin/orders/clear-all"
    ) {
      if (
        !user ||
        user.role !== "admin"
      ) {
        return send(res, 403, {
          error: "Akses admin diperlukan."
        });
      }

      await q`
        DELETE FROM order_items
      `;

      await q`
        DELETE FROM orders
      `;

      return send(res, 200, {
        ok: true,
        message:
          "Semua pesanan berhasil dihapus."
      });
    }

    // =========================
    // ADMIN PRODUCTS
    // =========================

    if (
      pathname.startsWith("/admin/products")
    ) {
      if (
        !user ||
        user.role !== "admin"
      ) {
        return send(res, 403, {
          error: "Akses admin diperlukan."
        });
      }

      const id =
        pathname.split("/")[3];

      // ADD PRODUCT
      if (req.method === "POST") {
        const body = await read(req);

        const rows = await q`
          INSERT INTO products(
            name,
            description,
            price,
            stock,
            image,
            category
          )
          VALUES(
            ${body.name},
            ${body.description || ""},
            ${Number(body.price)},
            ${Number(body.stock || 0)},
            ${body.image || ""},
            ${body.category || ""}
          )
          RETURNING *
        `;

        return send(res, 201, rows[0]);
      }

      // EDIT PRODUCT
      if (req.method === "PUT") {
        const body = await read(req);

        const rows = await q`
          UPDATE products
          SET
            name=${body.name},
            description=${body.description || ""},
            price=${Number(body.price)},
            stock=${Number(body.stock)},
            image=${body.image || ""},
            category=${body.category || ""}
          WHERE id=${id}
          RETURNING *
        `;

        return send(res, 200, rows[0]);
      }

      // DELETE PRODUCT
      if (req.method === "DELETE") {
        await q`
          DELETE FROM products
          WHERE id=${id}
        `;

        return send(res, 200, {
          ok: true
        });
      }
    }

    // =========================
    // NOT FOUND
    // =========================

    return send(res, 404, {
      error: "Not found"
    });

  } catch (error) {
    console.error(
      "API ERROR:",
      error
    );

    return send(res, 500, {
      error:
        error?.message ||
        "Server error"
    });
  }
};
