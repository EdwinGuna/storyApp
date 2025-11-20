import { syncPendingStories } from "../utils/offline/syncPendingStories.js";

import routes from "../routes/routes";
import {
  getActiveRoute,
  parseActivePathname,
  getActivePathname,
} from "../routes/url-parser";

import { getToken, clearToken, clearProfile, getProfile } from "../data/api.js";

import {
  generateMainNavigationListTemplate,
  generateAuthenticatedNavigationListTemplate,
  generateUnauthenticatedNavigationListTemplate,
  generateSubscribeButtonTemplate,
  generateUnsubscribeButtonTemplate,
} from "../templates";
import { isServiceWorkerAvailable } from "../utils";
import {
  getPushState,
  enableWebPush,
  disableWebPush,
} from "../notifications.js";
import { getSavedCount } from "../utils/bookmarks.js";

syncPendingStories().catch(console.error);

window.addEventListener("online", () => {
  console.log("Koneksi kembali online, mulai sync pending stories...");
  syncPendingStories().catch(console.error);
});

class App {
  #content = null;
  #drawerButton = null;
  #navigationDrawer = null;
  #currentPath;

  constructor({ navigationDrawer, drawerButton, content }) {
    this.#content = content;
    this.#drawerButton = drawerButton;
    this.#navigationDrawer = navigationDrawer;
    this.#currentPath = getActivePathname();

    this._setupDrawer();
  }

  _setupDrawer() {
    const btn = this.#drawerButton;
    const nav = this.#navigationDrawer;

    const setOpen = (open) => {
      nav.classList.toggle("open", open);
      btn.setAttribute("aria-expanded", String(open));
    };

    if (!btn.getAttribute("aria-controls")) {
      btn.setAttribute("aria-controls", nav.id || "navigation-drawer");
    }

    // set awal sesuai kelas yang ada
    setOpen(nav.classList.contains("open"));

    // toggle lewat tombol
    btn.addEventListener("click", () => {
      setOpen(!nav.classList.contains("open"));
    });

    document.body.addEventListener("click", (event) => {
      if (!nav.contains(event.target) && !btn.contains(event.target)) {
        setOpen(false);
      }

      nav.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => setOpen(false));
      });

      // tutup dengan Escape (aksesibilitas)
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && nav.classList.contains("open")) {
          setOpen(false);
          btn.focus(); // kembalikan fokus ke pemicu
        }
      });
    });
  }

  #setupNavigationList() {
    const navListMain = this.#navigationDrawer.querySelector("#navlist-main");
    const navList = this.#navigationDrawer.querySelector("#navlist");
    const savedCount = getSavedCount();
    //const savedCount = typeof BM.getSavedCount === 'function' ? BM.getSavedCount() : 0;

    if (!navListMain || !navList) return;

    // Selalu render menu utama
    navListMain.innerHTML = generateMainNavigationListTemplate({ savedCount });

    // Guest vs User
    const isLogin = !!getToken();
    navList.innerHTML = isLogin
      ? generateAuthenticatedNavigationListTemplate()
      : generateUnauthenticatedNavigationListTemplate();

    // ⬇️ isi nama user di nav
    if (isLogin) {
      const profile = getProfile();
      const nameEl = this.#navigationDrawer.querySelector(".user-name");

      if (nameEl && profile && Object.keys(profile).length > 0) {
        nameEl.textContent =
          (profile.name && profile.name.trim()) || profile.email || "User";
      }
    }

    // Logout
    const logoutBtn = document.getElementById("logout-button");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", (ev) => {
        ev.preventDefault();
        if (confirm("Keluar?")) {
          clearToken();
          clearProfile();
          location.hash = "/login";
          this.#setupNavigationList(); // refresh menu
        }
      });
    }
  }

  async #setupPushNotification() {
    if (!isServiceWorkerAvailable()) {
      console.log("[push] Service Worker tidak tersedia untuk push");
      return;
    }

    const el = document.getElementById("push-notification-tools");
    if (!el) return;

    try {
      const state = await getPushState();
      console.log("[push] state:", state);

      if (state === "on") {
      el.innerHTML = generateUnsubscribeButtonTemplate();
      document
        .getElementById("unsubscribe-button")
        ?.addEventListener("click", () => {
          disableWebPush()
            .catch((err) => console.error("[push] disable error:", err))
            .finally(() => this.#setupPushNotification());
        });
      } else {
        el.innerHTML = generateSubscribeButtonTemplate();
        document
          .getElementById("subscribe-button")
          ?.addEventListener("click", () => {
            enableWebPush()
              .catch((err) => console.error("[push] enable error (fallback):", err))
              .finally(() => this.#setupPushNotification());
          });
      }
    } catch (err) {
      console.error("[push] getPushState error:", err);

      // fallback: tetap tampilkan tombol Subscribe
      el.innerHTML = generateSubscribeButtonTemplate();
      document
        .getElementById("subscribe-button")
        ?.addEventListener("click", () => {
          enableWebPush()
            .catch((err) => console.error("[push] enable error (fallback):", err))
            .finally(() => this.#setupPushNotification());
        });
    }  
  }

  async renderPage() {
    const path = getActiveRoute();
    const page = routes[path];

    if (!page) {
      this.#content.innerHTML = "<p>Halaman tidak ditemukan</p>";
      this.#currentPath = path;
      return;
    }

    const params = parseActivePathname?.();
    const html = await page.render?.(params);

    const navType = this.#getNavigationType();
    const allowVT =
      !!document.startViewTransition &&
      (navType === "list-to-detail" || navType === "detail-to-list");

    if (allowVT) {
      const vt = document.startViewTransition(() => {
        this.#content.innerHTML = html;
      });
      await vt.finished;
    } else {
      this.#content.innerHTML = html;
    }

    await page.afterRender?.(params); // ✅ UI lain setelah VT
    this.#currentPath = path; // simpan untuk getNavigationType berikutnya
    this.#content.focus?.();
    this.#setupNavigationList();
    this.#setupPushNotification();
    scrollTo({ top: 0, behavior: "instant" });
  }

  #getNavigationType() {
    const from = this.#currentPath || "/";
    const to = getActiveRoute();

    const isList = (p) => p === "/" || p === "/stories";
    const isDetail = (p) => /^\/stories\/[^/]+$/.test(p);

    if (isList(from) && isDetail(to)) return "list-to-detail";
    if (isDetail(from) && isList(to)) return "detail-to-list";

    return null;
  }
}

export default App;
