import StoryPresenter from "./add-story-presenter.js";
import { addStoryAsGuest } from "../../data/api.js";
import { addStoryWithOffline } from "../../utils/offline/addStoryOffline.js";
import { MAP_SERVICE_API_KEY } from "../../config.js";
import L from "leaflet";
import { sleep } from "./../../utils/index.js";

export default class AddStoryPage {
  #presenter;
  #stream = null;
  #el = {};
  _photoSource = null;
  _captures = [];
  _selectedIdx = -1;
  _map;
  _markersGroup;
  _resizeBound = false;
  _mapRO = null;
  _lastBounds = null;
  _baseBounds = null;
  _pickMarker = null;
  _markerType = "pin";

  async render() {
    return `
      <section class="add-story container" aria-labelledby="add-title">
        <h2 id="add-title"><i class="fa-solid fa-plus" aria-hidden="true"></i>Tambah Story</h2>

        <form id="new-story-form" class="card add-form" novalidate>
          <!-- Deskripsi -->
          <div class="form-row">
            <label for="description">Deskripsi</label>
            <textarea id="description" name="description" rows="4" required
              placeholder="Tuliskan cerita kamu di sini ..."></textarea>
              <p class="help-text">Ceritakan momenmu (wajib diisi).</p>
          </div>

          <!-- Foto -->
          <div class="form-row1">
            <label for="photo">Foto (maks 1 MB)</label>
            <div id="dropzone" class="dropzone" tabindex="0" aria-label="Unggah foto">
              <i class="fa-solid fa-image" aria-hidden="true"></i>
              <p>Tarik & letakkan atau klik untuk memilih</p>
              <input id="photo" name="photo" type="file" accept="image/*" hidden>
            </div>
            <figure id="preview" class="preview" hidden>
              <img alt="Pratinjau foto">
              <figcaption class="muted">Pratinjau</figcaption>
            </figure>

            <ul id="gallery" class="gallery" aria-label="Hasil foto dari kamera"></ul>

            <div class="buttons">
              <button type="button" id="cam-open"    class="btn"><i class="fa-solid fa-camera" aria-hidden="true"></i><span>Buka Kamera</span></button>
              <button type="button" id="cam-capture" class="btn" disabled><i class="fa-solid fa-circle-dot" aria-hidden="true"></i><span>Ambil Foto</span></button>
              <button type="button" id="cam-close"   class="btn" disabled><i class="fa-solid fa-circle-xmark" aria-hidden="true"></i><span>Tutup Kamera</span></button>
            </div>
            <video id="cam-preview" autoplay playsinline style="display:none;max-width:100%"></video>

            <p id="add-msg" class="form-status sr-only" role="status" aria-live="polite"></p>
          </div>

          <fieldset class="form-row2">
            <legend>Lokasi (opsional) :</legend>

            <div class="latlng">
              <div>
                <label for="lat">Lat (opsional)</label>
                <input id="lat" name="lat" type="number" step="any" placeholder="-6.2">
              </div>
              <div>
                <label for="lon">Lon (opsional)</label>
                <input id="lon" name="lon" type="number" step="any" placeholder="106.8">
              </div>
            </div>

            <p id="loc-help" class="help-text1">
              Isi manual atau pilih titik di peta. Biarkan kosong jika tidak ingin menyertakan lokasi.
            </p>
          </fieldset>

          <div id="pick-map" role="region" aria-label="Peta lokasi story" aria-describedby="loc-help"></div>

          <!-- Aksi -->
          <div class="form-actions">
            <button type="reset"  class="btn"><i class="fa-solid fa-rotate-left" aria-hidden="true"></i><span>Reset</span></button>
            <button type="submit" class="btn btn--primary">
              <i class="fa-solid fa-paper-plane" aria-hidden="true"></i><span>Kirim</span>
            </button>
          </div>
        </form>
        
      </section>
    `;
  }

  async afterRender() {
    this.#cacheEls();
    this.#presenter = new StoryPresenter({
      model: { addStory: addStoryWithOffline, addStoryAsGuest },
      view: this,
    });
    this.bindCamera();
    this.setupDropZone();
    this._ensureMapAdd();
    this.mountAddStory();
  }

  #cacheEls() {
    const $ = (sel) => document.getElementById(sel);
    const form = $("new-story-form");
    const preview = $("preview");

    this.#el = {
      form,
      drop: $("dropzone"),
      fileInp: $("photo"),
      preview,
      imgEl: preview?.querySelector("img") || null,
      gallery: $("gallery"),
      addMsg: $("add-msg"),
      camOpen: $("cam-open"),
      camCap: $("cam-capture"),
      camClose: $("cam-close"),
      camVideo: $("cam-preview"),
      latInp: $("lat"),
      lonInp: $("lon"),
      pickMap: $("pick-map"),
    };
  }

  _createMarkerIcon(type = this._markerType, color = "#0ea5e9") {
    if (type === "default") return L.Icon.Default.prototype;

    if (type === "pin") {
      const svg = `
        <svg width="36" height="48" viewBox="0 0 36 48" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 48s14-16.2 14-28A14 14 0 0 0 4 20c0 11.8 14 28 14 28Z" fill="${color}"/>
        <circle cx="18" cy="20" r="6.5" fill="#fff"/>
      </svg>`;
      return L.icon({
        iconUrl: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
        iconSize: [30, 40],
        iconAnchor: [18, 44],
        popupAnchor: [0, -36],
        className: "pick-marker--pin",
      });
    }
  }

  _bindResizeOnce(mapEl) {
    if (this._resizeBound) return;
    this._resizeBound = true;

    let t,
      prevW = mapEl.clientWidth,
      prevH = mapEl.clientHeight;
    const hasArea = (b) =>
      b &&
      b.isValid &&
      b.isValid() &&
      (b.getNorthEast().lat !== b.getSouthWest().lat ||
        b.getNorthEast().lng !== b.getSouthWest().lng);

    const refit = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        if (!this._map || !mapEl) return;

        const w = mapEl.clientWidth;
        const h = mapEl.clientHeight;

        const sizeChanged = Math.abs(w - prevW) > 1 || Math.abs(h - prevH) > 1;

        this._map.invalidateSize();

        if (sizeChanged) {
          const layerCount = this._markersGroup
            ? Object.keys(this._markersGroup._layers || {}).length
            : 0;

          if (layerCount >= 2 && hasArea(this._lastBounds)) {
            // Batasi supaya tidak zoom-in lebih dalam dari zoom saat ini
            const capZoom = Math.min(16, this._map.getZoom());
            this._map.fitBounds(this._lastBounds, {
              padding: [24, 24],
              maxZoom: capZoom,
            });
          } else if (layerCount === 1 && this._pickMarker) {
            // Satu marker: jangan fitBounds (bikin “zoom banget”); cukup recenter
            const z = this._map.getZoom();
            this._map.setView(this._pickMarker.getLatLng(), z, {
              animate: false,
            });
          } else if (this._baseBounds) {
            // Tidak ada marker: fallback ke cakupan Indonesia (atau base bounds lain)
            const capZoom = Math.min(6, this._map.getZoom());
            this._map.fitBounds(this._baseBounds, {
              padding: [24, 24],
              maxZoom: capZoom,
            });
          } else if (this._lastCenter) {
            // Fallback terakhir
            this._map.setView(
              this._lastCenter,
              this._lastZoom ?? this._map.getZoom(),
              { animate: false },
            );
          }
        }

        prevW = w;
        prevH = h;
      }, 120);
    };

    this._mapRO = new ResizeObserver(refit);
    this._mapRO.observe(mapEl);

    window.addEventListener("resize", refit);
    window.addEventListener("orientationchange", refit);

    requestAnimationFrame(refit);
    setTimeout(refit, 0);
  }

  _ensureMapAdd() {
    const KEY = MAP_SERVICE_API_KEY;
    const { pickMap } = this.#el;
    if (!pickMap) return;

    if (this._map && this._map.getContainer?.() === pickMap) {
      this._map.invalidateSize();
      return;
    }

    if (this._map) {
      this._map.remove();
      this._map = null;
      this._markersGroup = null;
    }

    const map = L.map(pickMap, {
      center: [-2.5, 118],
      zoom: 5,
      worldCopyJump: true,
    });

    this._map = map;

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

    (streets || osm).addTo(map);

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
      .addTo(map);

    this._markersGroup = L.featureGroup().addTo(map);
    // fallback bounds Indonesia (kalau kamu mau tampilan awal luas)
    this._baseBounds = L.latLngBounds([-11.2, 94.7], [6.5, 141.1]);
    this._map.fitBounds(this._baseBounds, { padding: [24, 24], maxZoom: 6 });

    this._bindPickEvents(); // << aktifkan klik pet
    requestAnimationFrame(() => map?.invalidateSize());
    this._bindResizeOnce(pickMap);
    this._map.getContainer().style.cursor = "pointer";
  }

  _setMarker(lat, lng, { fit = true, type = this._markerType } = {}) {
    if (!this._map) return;
    if (!this._markersGroup)
      this._markersGroup = L.featureGroup().addTo(this._map);

    const ll = L.latLng(lat, lng);

    if (!this._pickMarker) {
      this._pickMarker = L.marker(ll, {
        draggable: true,
        icon: this._createMarkerIcon(type),
      }).addTo(this._markersGroup);

      // dragend → sync input + bounds
      this._pickMarker.on("dragend", () => {
        const p = this._pickMarker.getLatLng();
        if (this.#el.latInp) this.#el.latInp.value = p.lat.toFixed(6);
        if (this.#el.lonInp) this.#el.lonInp.value = p.lng.toFixed(6);
        this._updateBounds(true);
      });
    } else {
      this._pickMarker.setLatLng(ll);
      // kalau tipe berubah, GANTI ikonnya di marker yang sama
      if (type !== this._markerType) {
        this._pickMarker.setIcon(this._createMarkerIcon(type));
      }
    }

    this._markerType = type;
    // sync ke input
    if (this.#el.latInp) this.#el.latInp.value = ll.lat.toFixed(6);
    if (this.#el.lonInp) this.#el.lonInp.value = ll.lng.toFixed(6);

    // update bounds + (opsional) fit
    this._updateBounds(fit);
  }

  _updateBounds(fit = false) {
    if (!this._markersGroup) return;
    const b = this._markersGroup.getBounds();
    const layerCount = this._markersGroup
      ? Object.keys(this._markersGroup._layers || {}).length
      : 0;

    if (b && b.isValid && b.isValid() && layerCount >= 2) {
      this._lastBounds = b;
      if (fit && this._map)
        this._map.fitBounds(b, { padding: [24, 24], maxZoom: 16 });
    } else {
      this._lastBounds = null; // single/no marker → jangan pakai fitBounds di resize
    }
  }

  _bindPickEvents() {
    if (!this._map) return;
    const { latInp, lonInp } = this.#el;

    // klik peta → set marker
    this._map.on("click", (e) => {
      this._setMarker(e.latlng.lat, e.latlng.lng, { type: "pin", fit: true });
    });

    // isi manual → set marker
    const fromFields = () => {
      const lat = parseFloat(latInp?.value ?? "");
      const lng = parseFloat(lonInp?.value ?? "");
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        this._setMarker(lat, lng, { fit: true });
        this._map.setView([lat, lng], Math.max(this._map.getZoom(), 13), {
          animate: true,
        });
      }
    };
    latInp?.addEventListener("change", fromFields);
    lonInp?.addEventListener("change", fromFields);
  }

  _setPhotoSource(mode) {
    if (this._photoSource === mode) return;
    this._photoSource = mode;

    const { fileInp, drop, camOpen, camCap, camClose, preview, imgEl } =
      this.#el;

    if (mode === "file") {
      // matikan kamera & kosongkan hasil kamera
      this.stopCamera();
      this._captures.forEach((it) => {
        try {
          URL.revokeObjectURL(it.url);
          // eslint-disable-next-line no-empty
        } catch {}
      });
      this._captures = [];
      this._selectedIdx = -1;
      this._renderCaptures?.();

      // aktifkan jalur file, nonaktifkan kontrol kamera
      fileInp?.removeAttribute("disabled");
      drop?.classList.remove("is-disabled");
      camOpen?.setAttribute("disabled", "disabled");
      camCap?.setAttribute("disabled", "disabled");
      camClose?.setAttribute("disabled", "disabled");
    }

    if (mode === "camera") {
      if (imgEl?.src?.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(imgEl.src);
          // eslint-disable-next-line no-empty
        } catch {}
      }
      if (preview) preview.hidden = true;
      if (fileInp) fileInp.value = "";

      // aktifkan kontrol kamera, nonaktifkan jalur file
      camOpen?.removeAttribute("disabled");
      camCap?.removeAttribute("disabled"); // akan di-enable ketika stream on
      camClose?.removeAttribute("disabled");
      fileInp?.setAttribute("disabled", "disabled");
      drop?.classList.add("is-disabled");
    }
  }

  mountAddStory() {
    const { form } = this.#el;
    form?.addEventListener("submit", (e) => {
      e.preventDefault();
      this.clearLoading();

      const { description, photo } = this.getFormData();

      if (!description || description.length < 5) {
        this.showError("Uups, Deskripsi minimal 5 karakter!");
        return;
      }

      if (!photo) {
        this.showError("Uups, Harap pilih/ambil 1 foto (maks 1 MB)!");
        return;
      }

      this.#presenter.submitAddStory();
    });

    form?.addEventListener("reset", () => {
      setTimeout(() => this._resetFormAll({ skipFormReset: true }), 0);
    });
  }

  setupDropZone() {
    const { drop, fileInp, preview, imgEl } = this.#el;
    const openPicker = () => fileInp.click();
    drop.addEventListener("click", openPicker);
    drop.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openPicker();
      }
    });
    ["dragenter", "dragover"].forEach((ev) =>
      drop.addEventListener(ev, (e) => {
        e.preventDefault();
        drop.classList.add("is-drag");
      }),
    );
    ["dragleave", "drop"].forEach((ev) =>
      drop.addEventListener(ev, (e) => {
        e.preventDefault();
        drop.classList.remove("is-drag");
      }),
    );
    drop.addEventListener("drop", (e) => {
      const f = e.dataTransfer.files?.[0];
      this._selectedIdx = -1;
      if (f) handleFile(f);
    });
    fileInp.addEventListener("change", () => {
      const f = fileInp.files?.[0];
      this._selectedIdx = -1;
      if (f) handleFile(f);
    });

    const handleFile = (f) => {
      this._setPhotoSource("file");
      if (!f.type.startsWith("image/"))
        return this.announce("File harus berupa gambar", "error");
      if (f.size > 1024 * 1024)
        return this.announce("Ukuran gambar maksimal 1 MB", "error");
      const url = URL.createObjectURL(f);
      if (imgEl) {
        imgEl.src = url;
        preview.hidden = false;
      }
      this.announce("Foto siap diunggah", "success");
    };
  }

  announce(msg, kind = "info") {
    const el = document.getElementById("add-msg");
    if (!el) return;
    el.classList.remove("sr-only", "is-success", "is-error");
    if (kind === "success") el.classList.add("is-success");
    if (kind === "error") el.classList.add("is-error");
    el.textContent = msg;
  }

  _renderCaptures() {
    const { gallery } = this.#el;
    if (!gallery) return;
    gallery.innerHTML = this._captures
      .map(
        (it, i) =>
          `
        <li class="thumb ${i === this._selectedIdx ? "is-active" : ""}">
          <img src="${it.url}" alt="Hasil kamera ${i + 1}">
          <div class="tools">
            <button type="button" class="pick" data-i="${i}">Pilih</button>
            <button type="button" class="del"  data-i="${i}">&times;</button>
          </div>
        </li>
      `,
      )
      .join("");

    gallery.querySelectorAll(".pick").forEach(
      (b) =>
        (b.onclick = () => {
          this._selectedIdx = Number(b.dataset.i);
          this._renderCaptures();
          this.announce("Foto kamera dipilih.", "success");
        }),
    );

    gallery.querySelectorAll(".del").forEach(
      (b) =>
        (b.onclick = () => {
          const i = Number(b.dataset.i);
          const it = this._captures[i];
          if (it) URL.revokeObjectURL(it.url);
          this._captures.splice(i, 1);
          if (this._selectedIdx === i) this._selectedIdx = -1;
          if (this._selectedIdx > i) this._selectedIdx--; // rapikan index
          this._renderCaptures();
        }),
    );
  }

  _resetPhotoState() {
    const { fileInp, preview, imgEl } = this.#el;

    // bersihkan preview + blob URL
    if (imgEl?.src?.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(imgEl.src);
        // eslint-disable-next-line no-empty
      } catch {}
    }

    if (preview) preview.hidden = true;

    // kosongkan input file & state kamera
    if (fileInp) fileInp.value = "";
    this.stopCamera();
  }

  _resetFormAll({ skipFormReset = false } = {}) {
    const { form, fileInp, drop, camOpen, camCap, camClose } = this.#el;

    if (!skipFormReset && form) form.reset();

    // bersihkan preview & state media
    this._resetPhotoState?.();

    // bersihkan galeri hasil kamera (kalau ada fitur multi-capture)
    if (this._captures?.length) {
      this._captures.forEach((it) => {
        try {
          URL.revokeObjectURL(it.url);
          // eslint-disable-next-line no-empty
        } catch {}
      });
      this._captures = [];
    }
    if (typeof this._selectedIdx !== "undefined") this._selectedIdx = -1;
    if (this._renderCaptures) this._renderCaptures();

    if (this._pickMarker && this._markersGroup) {
      try {
        this._markersGroup.removeLayer(this._pickMarker);
        // eslint-disable-next-line no-empty
      } catch {}
    }
    this._pickMarker = null;
    this._updateBounds(false);
    if (!this._lastBounds && this._baseBounds && this._map) {
      this._map.fitBounds(this._baseBounds, { padding: [24, 24], maxZoom: 6 });
    }

    // kosongkan status
    this.clearLoading?.();
    this._photoSource = null;

    // aktifkan kembali jalur file & dropzone
    fileInp?.removeAttribute("disabled");
    drop?.classList.remove("is-disabled");

    camOpen?.removeAttribute("disabled");
    camCap?.setAttribute("disabled", "disabled");
    camClose?.setAttribute("disabled", "disabled");
  }

  bindCamera() {
    const { camOpen, camCap, camClose, camVideo, preview } = this.#el;

    camOpen.onclick = async () => {
      this._setPhotoSource("camera");
      try {
        if (preview) preview.hidden = true;
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Kamera tidak didukung di browser ini");
        }

        this.#stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (camVideo) {
          camVideo.srcObject = this.#stream;
          camVideo.style.display = "block";
        }
        camCap.disabled = false;
        camClose.disabled = false;
      } catch (e) {
        if (e?.name === "OverconstrainedError" || e.name === "NotFoundError") {
          try {
            this.#stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
            if (camVideo) {
              camVideo.srcObject = this.#stream;
              camVideo.style.display = "block";
            }
            camCap.disabled = false;
            camClose.disabled = false;
            return;
          } catch (err2) {
            this.showError(
              "Gagal buka kamera: " + (err2.message || err2.message),
            );
            return;
          }
        }
        this.showError("Gagal buka kamera: " + (e.message || e));
      }
    };

    camCap.onclick = async () => {
      this._setPhotoSource("camera");
      if (!this.#stream || !camVideo) return;
      const c = document.createElement("canvas");
      c.width = camVideo.videoWidth || 640;
      c.height = camVideo.videoHeight || 480;
      c.getContext("2d").drawImage(camVideo, 0, 0, c.width, c.height);
      const blob = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.92));
      const file = new File([blob], `story-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });

      const url = URL.createObjectURL(file);
      this._captures.push({ file, url });
      if (this._selectedIdx < 0) this._selectedIdx = 0;
      this._renderCaptures();
      this.announce(
        "Foto diambil. Kamu bisa ambil lagi atau pilih salah satu.",
        "success",
      );

      camClose.disabled = true;
      camCap.disabled = true;
      this.stopCamera();
    };

    camClose.onclick = () => this.stopCamera();
    window.addEventListener("hashchange", () => this.stopCamera(), {
      once: true,
    });
  }

  stopCamera() {
    const { camVideo } = this.#el;
    this.#stream?.getTracks().forEach((t) => t.stop());
    this.#stream = null;
    if (camVideo) {
      camVideo.srcObject = null;
      camVideo.style.display = "none";
    }
  }

  getFormData() {
    const { form, fileInp } = this.#el;
    const fd = new FormData(form);
    const pickedFile = (fileInp?.files || [])[0] || null;

    const camFile =
      this._selectedIdx >= 0 && this._captures[this._selectedIdx]
        ? this._captures[this._selectedIdx].file
        : null;

    const latStr = (fd.get("lat") || "").toString().trim();
    const lonStr = (fd.get("lon") || "").toString().trim();

    let photo = null;
    if (this._photoSource === "file") {
      photo = pickedFile;
    } else if (this._photoSource === "camera") {
      photo = camFile;
    } else {
      photo = null;
    }

    return {
      description: (fd.get("description") || "").toString().trim(),
      photo,
      lat: latStr ? parseFloat(latStr) : undefined,
      lon: lonStr ? parseFloat(lonStr) : undefined,
    };
  }

  showLoading(msg = "Posting ...") {
    const el = document.getElementById("add-msg");
    if (el) {
      el.classList.remove("sr-only");
      el.textContent = msg;
    }
  }

  clearLoading() {
    const el = document.getElementById("add-msg");
    if (!el) return;
    el.textContent = "";
    el.classList.add("sr-only");
    el.classList.remove("is-success", "is-error");
  }

  showError(msg) {
    const el = document.getElementById("add-msg");
    if (el) {
      el.classList.remove("sr-only");
      el.innerHTML = `<span role="alert" style="color:#b91c1c">${msg}</span>`;
    }
  }

  async showSuccess(msg) {
    const el = document.getElementById("add-msg");
    if (el) {
      el.classList.remove("sr-only", "is-error");
      el.classList.add("is-success");
      el.innerHTML = `<span style="color:#065f46">${msg}</span>`;
    }
    await sleep();
    this._resetFormAll();
  }
}
