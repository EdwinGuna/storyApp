import CONFIG from "../../config";

export default class AboutPage {
  async render() {
    return `
      <section class="about-simple container" aria-labelledby="page-title">
        <header class="about-head">
          <h1 id="page-title" class="about-title">
            <i class="fa-solid fa-book-open" aria-hidden="true"></i>
            About Application
          </h1>
          <p id="about-meta" class="about-meta">
            <i class="fa-solid fa-database" aria-hidden="true"></i>
            Sumber data: <!-- diisi di afterRender -->
          </p>
          <p class="about-lead">
            <strong>Dicoding Story App</strong> adalah aplikasi sederhana untuk berbagi cerita
            dengan foto dan lokasi.
          </p>
        </header>

        <ul class="about-list" role="list">
          <li><i class="fa-solid fa-user-lock" aria-hidden="true"></i> Mendaftar & Login user</li>
          <li><i class="fa-solid fa-list" aria-hidden="true"></i> Menampilkan daftar story dari API</li>
          <li><i class="fa-solid fa-upload" aria-hidden="true"></i> Menambah story baru dengan foto & lokasi</li>
          <li><i class="fa-solid fa-map-location-dot" aria-hidden="true"></i> Menampilkan story di peta digital</li>
        </ul>

        <p class="about-note">
          <i class="fa-solid fa-diagram-project" aria-hidden="true"></i>
          Aplikasi ini dibuat dengan arsitektur <em>Single-Page Application</em> (SPA) menggunakan hash routing
          dan pola <em>Model-View-Presenter</em> (MVP).
        </p>
      </section>
    `;  
  }

  async afterRender() {
    document.title = "About — Dicoding Story App";

    // fokus ke heading untuk A11y
    const h2 = document.querySelector("#page-title");
    if (h2) {
      h2.setAttribute("tabindex", "-1");
      h2.focus({ preventScroll: false });
      setTimeout(() => h2.removeAttribute("tabindex"), 0);
    }

    // tampilkan BASE_URL sebagai tautan
    const meta = document.querySelector("#about-meta");
    if (meta) {
      const a = document.createElement("a");
      a.href = CONFIG.BASE_URL;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = CONFIG.BASE_URL;
      meta.append(" ", a);
    }
  }
}
