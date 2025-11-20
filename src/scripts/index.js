import "@fortawesome/fontawesome-free/css/all.min.css";
import "../styles/styles.css";
import "leaflet/dist/leaflet.css";
import "ol/ol.css";
import { getToken, clearToken, getProfile, clearProfile } from "./data/api.js";
import {
  bindExistingPushToToken,
  enableWebPush,
  disableWebPush,
  getPushState,
} from "./notifications.js";
import "@fontsource/roboto/400.css"; // normal
import "@fontsource/roboto/500.css"; // medium (optional)
import "@fontsource/roboto/700.css"; // bold

import App from "./pages/app";
import { registerServiceWorker } from "./utils/index.js";

export function syncAuthUI() {
  const isAuth = !!getToken();
  document.documentElement.classList.toggle("is-auth", isAuth);

  const wrap = document.getElementById("user-login");
  if (!wrap) return;

  const nameEl = wrap.querySelector(".user-name") || wrap;

  if (isAuth) {
    const { name, email } = getProfile() || {};
    nameEl.textContent = (name && name.trim()) || email || "user";
    wrap.hidden = false;
    wrap.classList.add("blink");
    setTimeout(() => wrap.classList.remove("blink"), 3000);
  } else {
    nameEl.textContent = "";
    wrap.hidden = true;
    wrap.classList.remove("blink");
  }
}

export async function refreshPushButton() {
  const btn = document.getElementById("pushToggle");
  if (!btn) return;

  // Pastikan child <i> & <span> ada
  let icon = btn.querySelector("i");
  let label = btn.querySelector("span");
  if (!icon) {
    icon = document.createElement("i");
    icon.setAttribute("aria-hidden", "true");
    btn.prepend(icon);
  }
  if (!label) {
    label = document.createElement("span");
    btn.append(label);
  }

  btn.setAttribute("aria-busy", "true");

  // Belum login
  if (!getToken()) {
    btn.disabled = true;
    btn.dataset.state = "off";
    btn.setAttribute("aria-pressed", "false");
    icon.className = "fa-regular fa-bell";
    label.textContent = "Login untuk mengaktifkan";
    btn.title = "Login untuk mengaktifkan";
    btn.removeAttribute("aria-busy");
    return;
  }

  let state = "off";
  try {
    state = await getPushState();
  } catch {
    state = "unsupported";
  }

  if (state === "unsupported" || state === "denied" || state === "guest") {
    btn.disabled = true;
    btn.dataset.state = "off";
    btn.setAttribute("aria-pressed", "false");
    icon.className = "fa-regular fa-bell";
    label.textContent =
      state === "unsupported"
        ? "Notifikasi tidak didukung"
        : state === "denied"
          ? "Izin ditolak di browser"
          : "Login untuk mengaktifkan";
    btn.title = label.textContent;
    btn.removeAttribute("aria-busy");
    return;
  }

  btn.disabled = false;
  const isOn = state === "on";
  btn.dataset.state = isOn ? "on" : "off";
  btn.setAttribute("aria-pressed", isOn ? "true" : "false");
  icon.className = isOn ? "fa-solid fa-bell-slash" : "fa-regular fa-bell";
  label.textContent = isOn ? "Unsubscribe" : "Subscribe";
  btn.title = "";
  btn.removeAttribute("aria-busy");
}

document.addEventListener("click", async (e) => {
  const btn = e.target.closest("button#pushToggle");
  if (!btn || btn.disabled) return;

  btn.disabled = true;
  btn.setAttribute("aria-busy", "true");

  try {
    const cur = btn.dataset.state || (await getPushState());
    const next = cur === "on" ? await disableWebPush() : await enableWebPush();

    btn.dataset.state = next;
    btn
      .querySelector("span")
      ?.replaceChildren(
        next === "on" ? "Unsubscribe" : "Subscribe",
      );
    const icon = btn.querySelector("i");
    if (icon)
      icon.className =
        next === "on" ? "fa-solid fa-bell-slash" : "fa-regular fa-bell";
  } catch (err) {
    alert(err.message);
  } finally {
    btn.removeAttribute("aria-busy");
    btn.disabled = false;
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  const app = new App({
    content: document.querySelector("#main-content"),
    drawerButton: document.querySelector("#drawer-button"),
    navigationDrawer: document.querySelector("#navigation-drawer"),
  });

  window.__initialLoad = true;
  let firstLoad = true;

  // Sembunyikan sementara kemampuan fokus <main>
  const main = document.getElementById("main-content");
  const _savedTabIndex = main?.getAttribute("tabindex") ?? null;
  if (main) main.removeAttribute("tabindex");

  async function onRouteChange() {
    syncAuthUI();
    await app.renderPage();

    const route = (location.hash || "#/").split("?")[0];

    if (firstLoad) {
      // kembalikan tabindex yang sempat disembunyikan
      if (main && _savedTabIndex !== null) {
        main.setAttribute("tabindex", _savedTabIndex || "-1");
      }
    } else {
      if (route === "#/" || route.startsWith("#/stories")) {
        // Halaman daftar: fokus + scroll (seperti “Skip to content” otomatis)
        const m = document.getElementById("main-content");
        if (m) {
          if (!m.hasAttribute("tabindex")) m.setAttribute("tabindex", "-1");
          m.focus(); // scroll diperbolehkan di list
        }
      } else if (route === "#/add") {
        // Halaman Tambah Story: jangan auto-scroll
        const h = document.getElementById("add-title"); // <h2 id="add-title">
        if (h) {
          if (!h.hasAttribute("tabindex")) h.setAttribute("tabindex", "-1");
          h.focus({ preventScroll: true }); // TETAP fokus (a11y), tanpa geser
          // opsional: bersihkan tabindex sementara agar tidak menetap di DOM
          setTimeout(() => h.removeAttribute("tabindex"), 0);
        } else {
          // Halaman lain: fokus tanpa scroll
          const m = document.getElementById("main-content");
          if (m) {
            if (!m.hasAttribute("tabindex")) m.setAttribute("tabindex", "-1");
            m.focus({ preventScroll: true });
          }
        }

        window.scrollTo(0, 0);
      } else {
        // Halaman lain: fokus tanpa scroll
        const m = document.getElementById("main-content");
        if (m) {
          if (!m.hasAttribute("tabindex")) m.setAttribute("tabindex", "-1");
          m.focus({ preventScroll: true });
        }
      }
    }
    // PENTING: ini sempat hilang di kode kamu
    firstLoad = false;
    window.__initialLoad = false;
    refreshPushButton();
  }

  await registerServiceWorker();
  console.log('Berhasil mendaftarkan service worker.');
  
  window.addEventListener("hashchange", onRouteChange);

  await onRouteChange();

  document.addEventListener("click", (e) => {
    const a = e.target.closest('a.skip-link[href="#main-content"]');
    if (!a) return;
    e.preventDefault();

    const main = document.getElementById("main-content");
    if (!main) return;

    // pastikan bisa difokus
    if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");

    // fokus dulu tanpa scroll (mencegah “lompat” aneh), lalu scroll rapi
    main.focus({ preventScroll: true });
    main.scrollIntoView({ block: "start", behavior: "smooth" });
  });

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("button#btn-logout");
    if (!btn) return;

    // matikan push + logout
    (async () => {
      try {
        await disableWebPush();
        // eslint-disable-next-line no-empty
      } catch {}
    })();

    clearToken?.();
    clearProfile?.();

    document.documentElement.classList.remove("is-auth");
    syncAuthUI?.();
    refreshPushButton?.();
    alert("Anda telah logout!");
    location.hash = "#/login";
  });

  window.addEventListener("auth:changed", async () => {
    syncAuthUI();
    if (getToken()) {
      try {
        await bindExistingPushToToken();
      } catch (e) {
        console.warn(e);
      }
    }
    refreshPushButton();
  });

  window.dispatchEvent(new Event("auth:changed"));

  document.addEventListener("click", (e) => {
    const a = e.target.closest('a.story-link[href^="#/stories/"]');
    if (!a) return;
    const id = a.dataset.storyId || decodeURIComponent(a.href.split("/").pop());
    const img = a.closest(".story-card")?.querySelector(".story-card__img");
    if (!img) return;
    img.style.viewTransitionName = "story-hero"; // OLD
    sessionStorage.setItem("vt-story-id", id);
    sessionStorage.setItem("vt-dir", "forward");
  });

  document.addEventListener("click", (e) => {
    const back = e.target.closest('a[href="#/"], button[data-back="list"]');
    if (!back) return;
    const hero = document.querySelector(
      '.story-detail__img,[data-role="story-image"]',
    );
    if (hero) {
      hero.style.viewTransitionName = "story-hero"; // OLD
      if (hero.dataset.storyId)
        sessionStorage.setItem("vt-story-id", hero.dataset.storyId);
    }
    sessionStorage.setItem("vt-dir", "back");
  });
});
