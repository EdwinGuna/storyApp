import HomePresenter from "./home-presenter.js";
import { getStories } from "../../data/api.js";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MAP_SERVICE_API_KEY } from "./../../../scripts/config.js";
//import Math from "./math.js";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

export default class HomePage {
  #presenter;
  _map;
  _markersGroup;
  _markersById = new Map();
  _cardsById = new Map();
  _allStories = [];
  _currentPage = 1;
  _pageSize = 4;
  _resizeBound = false;
  _mapRO = null;
  _lastBounds = null;

  async render() {
    return `
      <section class="container">
        <h1 id="stories-title">DAFTAR STORY</h1>

        <form id="story-filters" class="filters" aria-label="Filter story">
          <label for="q">
            <span class="visually-hidden">Cari</span>
            <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
            <input id="q" name="q" type="search" placeholder="Cari nama / deskripsi…" autocomplete="off"/>
          </label>
          <label for="onlyWithLoc">
            <input id="onlyWithLoc" name="onlyWithLoc" type="checkbox"/>
            Hanya yang punya lokasi
          </label>
        </form>

        <div id="story-map" style="margin-top:1rem"
          aria-labelledby="stories-title" aria-label="Peta lokasi story">
        </div>

        <div id="story-list" class="story-list" aria-live="polite"></div>
        <nav id="story-pagination" class="pagination" aria-label="Navigasi halaman story"></nav>
      </section>
    `;  
  }

  async afterRender() {
    this.#presenter = new HomePresenter({
      model: { getStories },
      view: this,
    });

    this._currentPage = 1;
    await this.#presenter.loadStories();

    this._ensureMap();

    const form = document.getElementById("story-filters");
    form.addEventListener("input", () => {
      this._currentPage = 1;
      this._applyFiltersAndRender();
    });
  }

  showLoading() {
    document.querySelector("#story-list").textContent = "Memuat…";
  }
  showError(msg) {
    document.querySelector("#story-list").innerHTML =
      `<p role="alert">${msg}</p>`;
  }

  showStories(stories) {
    this._allStories = Array.isArray(stories) ? stories : [];

    this._ensureMap();
    this._currentPage = 1;
    this._applyFiltersAndRender();
  }

  // --- method baru: pasang observer & listener sekali saja
  _bindResizeOnce(mapEl) {
    if (this._resizeBound) return;
    this._resizeBound = true;

    const refit = (() => {
      let t;
      return () => {
        clearTimeout(t);
        t = setTimeout(() => {
          if (!this._map) return;
          this._map.invalidateSize();
          if (this._lastBounds) {
            this._map.fitBounds(this._lastBounds, { padding: [24, 24] });
          }
        }, 100);
      };
    })();

    this._mapRO = new ResizeObserver(refit);
    this._mapRO.observe(mapEl);

    window.addEventListener("resize", refit);
    window.addEventListener("orientationchange", refit);

    requestAnimationFrame(refit);
    setTimeout(refit, 0);
  }

  _ensureMap() {
    const KEY = MAP_SERVICE_API_KEY;
    const mapEl = document.querySelector("#story-map");
    if (!mapEl) return;

    this._bindResizeOnce(mapEl);

    if (this._map && this._map.getContainer?.() === mapEl) {
      this._map.invalidateSize();
      return;
    }

    if (this._map) {
      this._map.remove();
      this._map = null;
      this._markersGroup = null;
    }

    this._map = L.map(mapEl, {
      center: [-2.5, 118],
      zoom: 5,
      worldCopyJump: true,
    });

    this._markersGroup = L.featureGroup().addTo(this._map);
    requestAnimationFrame(() => this._map?.invalidateSize());

    const streets =
      KEY &&
      L.tileLayer(
        `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}${L.Browser.retina ? "@2x" : ""}.png?key=${KEY}`,
        {
          attribution: "&copy; OSM, &copy; MapTiler",
          tileSize: L.Browser.retina ? 512 : 256,
          zoomOffset: L.Browser.retina ? -1 : 0,
          maxZoom: 20,
        },
      );

    const hybrid =
      KEY &&
      L.tileLayer(
        `https://api.maptiler.com/maps/hybrid/{z}/{x}/{y}${L.Browser.retina ? "@2x" : ""}.jpg?key=${KEY}`,
        {
          attribution: "&copy; MapTiler, &copy; OSM, Imagery &copy; providers",
          tileSize: L.Browser.retina ? 512 : 256,
          zoomOffset: L.Browser.retina ? -1 : 0,
          maxZoom: 20,
        },
      );

    const osm = L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      },
    );

    const openTopo = L.tileLayer(
      "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
      {
        attribution:
          'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | ' +
          'Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
        maxZoom: 17,
        subdomains: "abc",
      },
    );

    (streets || osm).addTo(this._map);

    const baseLayers = {
      "OSM Standard": osm,
      OpenTopoMap: openTopo,
    };

    L.control
      .layers(
        {
          ...(KEY
            ? { "MapTiler Streets": streets, "MapTiler Hybrid": hybrid }
            : {}),
          ...baseLayers,
        },
        null,
        { collapsed: false },
      )
      .addTo(this._map);

    this._markersGroup = L.featureGroup().addTo(this._map);
    requestAnimationFrame(() => this._map?.invalidateSize());
  }

  _applyFiltersAndRender() {
    const q = (document.getElementById("q")?.value || "").trim().toLowerCase();
    const onlyWithLoc = document.getElementById("onlyWithLoc")?.checked;

    // filter data
    const filtered = this._allStories.filter((s) => {
      const lat = Number(s.lat ?? s.latitude);
      const lon = Number(s.lon ?? s.lng ?? s.longitude);
      if (onlyWithLoc && !(Number.isFinite(lat) && Number.isFinite(lon)))
        return false;

      const hay = `${s.name ?? ""} ${s.description ?? ""}`.toLowerCase();
      return q ? hay.includes(q) : true;
    });

    const totalItems = filtered.length;
    const pageSize = this._pageSize;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    // clamp currentPage
    if (this._currentPage > totalPages) this._currentPage = totalPages;
    if (this._currentPage < 1) this._currentPage = 1;

    const start = (this._currentPage - 1) * pageSize;
    const end = start + pageSize;
    const pageItems = filtered.slice(start, end);

    // render daftar
    this._renderList(pageItems);

    this._renderMarkers(pageItems);
    this._renderPagination(totalPages);
  }

  _renderList(stories) {
    const listEl = document.querySelector("#story-list");
    if (!stories.length) {
      listEl.innerHTML = '<p class="muted">Tidak ada story yang cocok.</p>';
      return;
    }

    this._cardsById.clear();

    const html = stories
      .map((s) => {
        const id = String(s.id);
        // gunakan data-id sehingga bisa disinkronkan dengan marker
        return `
          <article class="story-card" data-id="${id}" tabindex="0">
            <img src="${s.photoUrl}" alt="Foto ${this._e(s.name)}" width="120" loading="lazy"/>
            <div class="story-card__body">
              <h2 class="story-card__title">${this._e(s.name)}</h2>
              <p class="story-card__desc">${this._e(s.description ?? "")}</p>
              <time class="story-card__time" datetime="${s.createdAt}">
                ${new Date(s.createdAt).toLocaleString()}
              </time><br>
              <a class="btn btn--primary" href="#/stories/${encodeURIComponent(id)}">Detail</a>
            </div>
          </article>
        `;
      })
      .join("");

    listEl.innerHTML = html;

    // cache element → untuk sinkronisasi
    listEl.querySelectorAll(".story-card").forEach((el) => {
      const id = el.getAttribute("data-id");
      this._cardsById.set(id, el);

      const activate = () => this._activateById(id, { from: "card" });
      el.addEventListener("mouseenter", activate);
      el.addEventListener("focus", activate);
    });

    this._highlightCardIfRequested();
  }

  _renderMarkers(stories) {
    // bersihkan marker lama
    if (!this._map || !this._markersGroup) return;

    this._markersGroup.clearLayers();
    this._markersById.clear();

    const bounds = [];
    stories.forEach((s) => {
      const id = String(s.id);
      const lat = Number(s.lat ?? s.latitude);
      const lon = Number(s.lon ?? s.lng ?? s.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

      const m = L.marker([lat, lon]).addTo(this._markersGroup);
      m.bindPopup(
        `<strong>${this._e(s.name ?? "Tanpa nama")}</strong><br>${this._e(s.description ?? "")}`,
      );

      m.on("click", () =>
        this._activateById(id, { from: "marker", pan: false }),
      );

      this._markersById.set(id, m);
      bounds.push([lat, lon]);
    });

    if (bounds.length) {
      const bb = L.latLngBounds(bounds);
      this._lastBounds = bb; // simpan untuk refit saat resize
      this._map.fitBounds(bb, { padding: [24, 24] });
    }
  }

  _renderPagination(totalPages) {
    const nav = document.getElementById("story-pagination");
    if (!nav) return;

    // kalau cuma 1 halaman dan datanya sedikit, kamu boleh kosongkan pagination
    if (totalPages <= 1) {
      nav.innerHTML = "";
      return;
    }

    const current = this._currentPage;

    let html = `
    <button type="button" class="page-btn" data-page="${current - 1}" ${current === 1 ? "disabled" : ""}>
      &laquo; Prev
    </button>
    <span class="page-info">Page ${current} / ${totalPages}</span>
    <button type="button" class="page-btn" data-page="${current + 1}" ${current === totalPages ? "disabled" : ""}>
      Next &raquo;
    </button>
  `;

    nav.innerHTML = html;

    // event handler (delegasi)
    nav.querySelectorAll(".page-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetPage = Number(btn.dataset.page);
        if (
          Number.isFinite(targetPage) &&
          targetPage >= 1 &&
          targetPage <= totalPages
        ) {
          this._currentPage = targetPage;
          this._applyFiltersAndRender();
          // optional: scroll ke atas list
          document
            .getElementById("stories-title")
            ?.scrollIntoView({ behavior: "smooth" });
        }
      });
    });
  }

  _highlightCardIfRequested() {
    // Ambil query di belakang hash (contoh: #/stories?focus=ID&hl=1)
    const hash = location.hash || "";
    const q = hash.includes("?") ? hash.split("?")[1] : "";
    const params = new URLSearchParams(q);

    const hl = params.get("hl"); // '1' atau 'blink'
    const focus = params.get("focus"); // id kartu (sama dengan data-id)
    if (!hl) return;

    // Cari kartu; fallback ke kontainer list
    const esc = (s) =>
      window.CSS && CSS.escape
        ? CSS.escape(s)
        : String(s).replace(/["\\]/g, "\\$&");
    const card = focus
      ? document.querySelector(`.story-card[data-id="${esc(focus)}"]`)
      : null;
    const target =
      card ||
      document.querySelector(".story-card") ||
      document.getElementById("story-list");

    // Scroll ke target
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: card ? "center" : "start",
    });

    const cls =
      hl === "blink"
        ? "highlight-blink"
        : hl === "pop"
          ? "highlight-pop"
          : "highlight-glow";

    target.classList.remove(
      "highlight-glow",
      "highlight-blink",
      "highlight-pop",
    );
    void target.offsetWidth;

    target.classList.add(cls);
    setTimeout(() => target.classList.remove(cls), 10000);

    try {
      const [base] = hash.split("?");
      history.replaceState({}, "", base);
    } catch {}
  }

  _activateById(id, { pan = true } = {}) {
    const card = this._cardsById.get(id);
    if (card) {
      document
        .querySelectorAll(".story-card--active")
        .forEach((el) => el.classList.remove("story-card--active"));
      card.classList.add("story-card--active");
      card.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    // highlight marker + popup
    const marker = this._markersById.get(id);
    if (marker) {
      if (pan) this._map.panTo(marker.getLatLng());
      marker.openPopup();
    }
  }

  _e(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
}
