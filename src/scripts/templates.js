import { showFormattedDate } from './utils/index';

/*export function generateLoaderTemplate() {
  return `
    <div class="loader"></div>
  `;
}

export function generateLoaderAbsoluteTemplate() {
  return `
    <div class="loader loader-absolute"></div>
  `;
}*/

export function generateMainNavigationListTemplate({ savedCount = 0 } = {}) {
  const hasSaved = savedCount > 0;
  const iconStyle = hasSaved? 'fa-solid' : 'fa-regular';
  const badge = hasSaved
    ? `<span class="nav-badge" aria-label="${savedCount} story tersimpan">${savedCount}</span>`
    : '';

  return `
    <li><a href="#/"><i class="fa-solid fa-house" aria-hidden="true"></i>Beranda</a></li>
    <li><a href="#/about"><i class="fa-solid fa-circle-info" aria-hidden="true"></i>About</a></li>
    <li><a href="#/add"><i class="fa-solid fa-plus" aria-hidden="true"></i>Add Story</a></li>
    <li>
      <a href="#/bookmark">
        <i class="${iconStyle} fa-bookmark" aria-hidden="true"></i>
        <span>Story Tersimpan</span>
        ${badge}
      </a>
    </li>
  `;
}

export function generateUnauthenticatedNavigationListTemplate() {
  return `
    <li><a id="login-button" href="#/login"><i class="fa-solid fa-right-to-bracket" aria-hidden="true"></i>Login</a></li>
    <li><a id="register-button" href="#/register"><i class="fa-solid fa-user-plus" aria-hidden="true"></i>Register</a></li>
  `;
}

export function generateAuthenticatedNavigationListTemplate() {
  return `
    <li id="push-notification-tools" class="push-notification-tools">
      <i class="fa-regular fa-bell" aria-hidden="true"></i></li>
    <li><a id="logout-button" class="logout-button" href="#/logout"><i class="fas fa-sign-out-alt"></i> Logout</a></li>
    <li data-auth="user">
      <span id="user-login" class="user-label">
        <i class="fa-regular fa-user" aria-hidden="true"></i>
        <span class="user-name"></span>
      </span>
    </li>
  `;
}
/*
export function generateReportsListEmptyTemplate() {
  return `
    <div id="reports-list-empty" class="reports-list__empty">
      <h2>Tidak ada laporan yang tersedia</h2>
      <p>Saat ini, tidak ada laporan kerusakan fasilitas umum yang dapat ditampilkan.</p>
    </div>
  `;
}

export function generateReportsListErrorTemplate(message) {
  return `
    <div id="reports-list-error" class="reports-list__error">
      <h2>Terjadi kesalahan pengambilan daftar laporan</h2>
      <p>${message ? message : 'Gunakan jaringan lain atau laporkan error ini.'}</p>
    </div>
  `;
}

export function generateReportDetailErrorTemplate(message) {
  return `
    <div id="reports-detail-error" class="reports-detail__error">
      <h2>Terjadi kesalahan pengambilan detail laporan</h2>
      <p>${message ? message : 'Gunakan jaringan lain atau laporkan error ini.'}</p>
    </div>
  `;
}

export function generateCommentsListEmptyTemplate() {
  return `
    <div id="report-detail-comments-list-empty" class="report-detail__comments-list__empty">
      <h2>Tidak ada komentar yang tersedia</h2>
      <p>Saat ini, tidak ada komentar yang dapat ditampilkan.</p>
    </div>
  `;
}

export function generateCommentsListErrorTemplate(message) {
  return `
    <div id="report-detail-comments-list-error" class="report-detail__comments-list__error">
      <h2>Terjadi kesalahan pengambilan daftar komentar</h2>
      <p>${message ? message : 'Gunakan jaringan lain atau laporkan error ini.'}</p>
    </div>
  `;
}

export function generateReportItemTemplate({
  id,
  title,
  description,
  evidenceImages,
  reporterName,
  createdAt,
  placeNameLocation,
}) {
  return `
    <div tabindex="0" class="report-item" data-reportid="${id}">
      <img class="report-item__image" src="${evidenceImages[0]}" alt="${title}">
      <div class="report-item__body">
        <div class="report-item__main">
          <h2 id="report-title" class="report-item__title">${title}</h2>
          <div class="report-item__more-info">
            <div class="report-item__createdat">
              <i class="fas fa-calendar-alt"></i> ${showFormattedDate(createdAt, 'id-ID')}
            </div>
            <div class="report-item__location">
              <i class="fas fa-map"></i> ${placeNameLocation}
            </div>
          </div>
        </div>
        <div id="report-description" class="report-item__description">
          ${description}
        </div>
        <div class="report-item__more-info">
          <div class="report-item__author">
            Dilaporkan oleh: ${reporterName}
          </div>
        </div>
        <a class="btn report-item__read-more" href="#/reports/${id}">
          Selengkapnya <i class="fas fa-arrow-right"></i>
        </a>
      </div>
    </div>
  `;
}

export function generateDamageLevelMinorTemplate() {
  return `
    <span class="report-detail__damage-level__minor" data-damage-level="minor">Kerusakan Rendah</span>
  `;
}

export function generateDamageLevelModerateTemplate() {
  return `
    <span class="report-detail__damage-level__moderate" data-damage-level="moderate">Kerusakan Sedang</span>
  `;
}

export function generateDamageLevelSevereTemplate() {
  return `
    <span class="report-detail__damage-level__severe" data-damage-level="severe">Kerusakan Berat</span>
  `;
}

export function generateDamageLevelBadge(damageLevel) {
  if (damageLevel === 'minor') {
    return generateDamageLevelMinorTemplate();
  }

  if (damageLevel === 'moderate') {
    return generateDamageLevelModerateTemplate();
  }

  if (damageLevel === 'severe') {
    return generateDamageLevelSevereTemplate();
  }

  return '';
}

export function generateReportDetailImageTemplate(imageUrl = null, alt = '') {
  if (!imageUrl) {
    return `
      <img class="report-detail__image" src="images/placeholder-image.jpg" alt="Placeholder Image">
    `;
  }

  return `
    <img class="report-detail__image" src="${imageUrl}" alt="${alt}">
  `;
}

export function generateReportCommentItemTemplate({ photoUrlCommenter, nameCommenter, body }) {
  return `
    <article tabindex="0" class="report-detail__comment-item">
      <img
        class="report-detail__comment-item__photo"
        src="${photoUrlCommenter}"
        alt="Commenter name: ${nameCommenter}"
      >
      <div class="report-detail__comment-item__body">
        <div class="report-detail__comment-item__body__more-info">
          <div class="report-detail__comment-item__body__author">${nameCommenter}</div>
        </div>
        <div class="report-detail__comment-item__body__text">${body}</div>
      </div>
    </article>
  `;
}

export function generateReportDetailTemplate({
  title,
  description,
  damageLevel,
  evidenceImages,
  location,
  reporterName,
  createdAt,
}) {
  const createdAtFormatted = showFormattedDate(createdAt, 'id-ID');
  const damageLevelBadge = generateDamageLevelBadge(damageLevel);
  const imagesHtml = evidenceImages.reduce(
    (accumulator, evidenceImage) =>
      accumulator.concat(generateReportDetailImageTemplate(evidenceImage, title)),
    '',
  );

  return `
    <div class="report-detail__header">
      <h1 id="title" class="report-detail__title">${title}</h1>

      <div class="report-detail__more-info">
        <div class="report-detail__more-info__inline">
          <div id="createdat" class="report-detail__createdat" data-value="${createdAtFormatted}"><i class="fas fa-calendar-alt"></i></div>
          <div id="location-place-name" class="report-detail__location__place-name" data-value="${location.placeName}"><i class="fas fa-map"></i></div>
        </div>
        <div class="report-detail__more-info__inline">
          <div id="location-latitude" class="report-detail__location__latitude" data-value="${location.latitude}">Latitude:</div>
          <div id="location-longitude" class="report-detail__location__longitude" data-value="${location.longitude}">Longitude:</div>
        </div>
        <div id="author" class="report-detail__author" data-value="${reporterName}">Dilaporkan oleh:</div>
      </div>

      <div id="damage-level" class="report-detail__damage-level">
        ${damageLevelBadge}
      </div>
    </div>

    <div class="container">
      <div class="report-detail__images__container">
        <div id="images" class="report-detail__images">${imagesHtml}</div>
      </div>
    </div>

    <div class="container">
      <div class="report-detail__body">
        <div class="report-detail__body__description__container">
          <h2 class="report-detail__description__title">Informasi Lengkap</h2>
          <div id="description" class="report-detail__description__body">
            ${description}
          </div>
        </div>
        <div class="report-detail__body__map__container">
          <h2 class="report-detail__map__title">Peta Lokasi</h2>
          <div class="report-detail__map__container">
            <div id="map" class="report-detail__map"></div>
            <div id="map-loading-container"></div>
          </div>
        </div>
  
        <hr>
  
        <div class="report-detail__body__actions__container">
          <h2>Aksi</h2>
          <div class="report-detail__actions__buttons">
            <div id="save-actions-container"></div>
            <div id="notify-me-actions-container">
              <button id="report-detail-notify-me" class="btn btn-transparent">
                Try Notify Me <i class="far fa-bell"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}*/

export function generateSubscribeButtonTemplate() {
  return `
    <button id="subscribe-button" class="btn subscribe-button">
      Subscribe <i class="fas fa-bell"></i>
    </button>
  `;
}

export function generateUnsubscribeButtonTemplate() {
  return `
    <button id="unsubscribe-button" class="btn unsubscribe-button">
      Unsubscribe <i class="fas fa-bell-slash"></i>
    </button>
  `;
}

/*export function generateSaveReportButtonTemplate() {
  return `
    <button id="report-detail-save" class="btn btn-transparent">
      Simpan laporan <i class="far fa-bookmark"></i>
    </button>
  `;
}

export function generateRemoveReportButtonTemplate() {
  return `
    <button id="report-detail-remove" class="btn btn-transparent">
      Buang laporan <i class="fas fa-bookmark"></i>
    </button>
  `;
}*/
export function generateSaveStoryButtonTemplate() {
  return `
    <button id="story-detail-save">
      Save Story <i class="far fa-bookmark"></i>
    </button>
  `;
}

export function generateRemoveStoryButtonTemplate() {
  return `
    <button id="story-detail-remove">
      Delete Story <i class="fas fa-bookmark"></i>
    </button>
  `;
}