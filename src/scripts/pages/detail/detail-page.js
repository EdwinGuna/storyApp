import { getDetailStory } from "../../data/api.js";
import { generateSaveStoryButtonTemplate, generateRemoveStoryButtonTemplate } from '../../templates.js';
import DetailPresenter from "../detail/detail-presenter.js";
import Database from '../../data/database.js';
import L from "leaflet";

export default class DetailPage {
  #presenter;
  _map = null;

  async render() {
    return `
      <section class="container story-detail">
        <header class="story_detail_header">
          <h1 id="detail-title">DETAIL STORY</h1>
          <a class="backlink" href="#/stories">Story List</a>
        </header>

        <figure class="story-detail__media">
          <img id="story-pic" class="story-detail__pic" alt="" loading="lazy" />
        </figure>

        <div id="detail-story-save" class="detail-story-save">
          <h2 class="action-margin">AKSI</h2>
        </div>  
        <hr>
        <div class="story-detail__grid">
          <article id="story" class="story-detail__body" aria-live="polite"></article>
          <div id="story-map" class="story-detail__map" aria-label="Lokasi pada peta"></div>
        </div>
      </section>
    `;
  }

  async afterRender(params = {}) {
    let id = params?.id;
    if (!id) {
      const parts = window.location.hash.split("/");
      id = parts[2] ? decodeURIComponent(parts[2]) : "";
    }

    if (!id) {
      this.showError("ID story tidak ditemukan di URL");
      return;
    }

    this.#presenter = new DetailPresenter({
      storyId: id,
      model: { getDetailStory },
      view: this,
      dbModel: Database,
    });

    const h = document.getElementById("detail-title");
    if (h && window.__initialLoad === false) {
      h.setAttribute("tabindex", "-1");
      requestAnimationFrame(() => {
        h.focus();
        setTimeout(() => h.removeAttribute("tabindex"), 0);
      });
    }

    this.showLoading();
    try {
      await this.#presenter.loadStory(id);
      await this.#presenter.showSaveButton();
    } catch (e) {
      this.showError(e.message || "Gagal memuat detail");
      return;
    }
  }

  showDetail(story) {
    const picture = document.getElementById("story-pic");
    if (picture) {
      picture.src = story.photoUrl || "";
      picture.alt = story.name ? `Foto ${story.name}` : "Foto story";
    }

    const h1 = document.getElementById("detail-title");
    if (h1) h1.textContent = story.name || "Detail Story";

    const el = document.getElementById("story");
    if (!el) return;

    el.innerHTML = `
      <article class="detail-data">
        <p>Description : ${story.description || ""}</p>
        ${
          story.createdAt
            ? (() => {
                const d = new Date(story.createdAt);
                return `<p><strong>Created :</strong> <time datetime="${d.toISOString()}">${d.toLocaleString()}</time></p>`;
              })()
            : ""
        }
        <h2>Detail : </h2>
        <dl class="story-meta">
          <dt>Id :</dt><dd>${story.id}</dd>
          <dt>Lat :</dt><dd>${story.lat ?? "-"}</dd>
          <dt>Lon :</dt><dd>${story.lon ?? "-"}</dd>
        </dl>
      </article>
    `;

    this.initMapForStory(story);
  }

  renderSaveButton() {
    document.getElementById('detail-story-save').innerHTML =
      generateSaveStoryButtonTemplate();

    document.getElementById('story-detail-save').addEventListener('click', async () => {
      await this.#presenter.saveStory();
      await this.#presenter.showSaveButton();
    });
  }

  saveToBookmarkSuccessfully(message) {
    console.log(message);
  }

  saveToBookmarkFailed(message) {
    alert(message);
  }

  renderRemoveButton() {
    document.getElementById('detail-story-save').innerHTML =
      generateRemoveStoryButtonTemplate();

    document.getElementById('story-detail-remove').addEventListener('click', async () => {
      await this.#presenter.removeStory();
      await this.#presenter.showSaveButton();
    });
  }

  removeFromBookmarkSuccessfully(message) {
    console.log(message);
  }

  removeFromBookmarkFailed(message) {
    alert(message);
  }

  showLoading() {
    document.querySelector("#story").textContent = "Memuat…";
  }

  showError(msg) {
    document.querySelector("#story").innerHTML = `<p role="alert">${msg}</p>`;
  }

  initMapForStory(story) {
    const mapEl = document.querySelector("#story-map");
    if (!mapEl) return;

    const isValidNumberInRange = (v, min, max) => {
      if (v === null || v === undefined) return false;
      if (typeof v === "string" && v.trim() === "") return false;
      const n = Number(v);
      return Number.isFinite(n) && n >= min && n <= max;
    };

    const hasLat = isValidNumberInRange(story?.lat, -90, 90);
    const hasLon = isValidNumberInRange(story?.lon, -180, 180);

    if (!hasLat || !hasLon) {
      if (this._map) {
        this._map.remove();
        this._map = null;
      }
      mapEl.style.display = "none";
      return;
    }

    mapEl.style.display = "";

    const lat = Number(story.lat);
    const lon = Number(story.lon);

    if (this._map) {
      this._map.remove();
      this._map = null;
    }

    this._map = L.map(mapEl).setView([lat, lon], 13);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(this._map);

    L.marker([lat, lon])
      .addTo(this._map)
      .bindPopup(`<b>${story.name}</b><br>${story.description || ""}`);

    setTimeout(() => this._map.invalidateSize(), 0);
  }
}
