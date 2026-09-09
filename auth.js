const form = document.querySelector("#form");
const msg = document.querySelector("#msg");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  msg.textContent = "Memproses login...";

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(
        Object.fromEntries(new FormData(form))
      )
    });

    const data = await response.json();

    if (response.ok) {
      if (data.user.role === "admin") {
        window.location.href = "/admin.html";
      } else {
        window.location.href = "/";
      }
    } else {
      msg.textContent = data.error || "Login gagal.";
    }
  } catch (error) {
    console.error(error);
    msg.textContent = "Terjadi kesalahan koneksi.";
  }
});
