(() => {
  "use strict";

  const ready = () => {
    document.querySelectorAll("img").forEach(img => {
      const mark = () => img.classList.add("loaded");
      if (img.complete) mark(); else img.addEventListener("load", mark, { once: true });
      img.addEventListener("error", mark, { once: true });
    });

    document.querySelectorAll("button[type=submit]").forEach(btn => {
      const form = btn.closest("form");
      if (!form) return;
      form.addEventListener("submit", () => {
        if (form.dataset.smoothBusy === "1") return;
        form.dataset.smoothBusy = "1";
        setTimeout(() => { btn.disabled = true; }, 0);
      });
    });

    document.addEventListener("click", e => {
      const a = e.target.closest("a[href]");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("javascript:") || href.startsWith("mailto:")) return;
      try {
        const url = new URL(href, location.href);
        if (url.origin !== location.origin) return;
        if (url.pathname === location.pathname && url.search === location.search) return;
        e.preventDefault();
        document.body.style.opacity = "0";
        setTimeout(() => { location.href = url.href; }, 120);
      } catch (_) {}
    });

    const loading = document.querySelector(".sutomo-loading");
    if (loading) setTimeout(() => loading.classList.add("hide"), 220);

    window.sutomoToast = function(message) {
      let toast = document.querySelector(".sutomo-toast");
      if (!toast) {
        toast = document.createElement("div");
        toast.className = "sutomo-toast";
        document.body.appendChild(toast);
      }
      toast.textContent = message;
      toast.classList.add("show");
      clearTimeout(window.__sutomoToastTimer);
      window.__sutomoToastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
    };
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready);
  else ready();
})();
