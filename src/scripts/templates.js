export function generateMainNavigationListTemplate({ savedCount = 0 } = {}) {
  const hasSaved = savedCount > 0;
  const iconStyle = hasSaved ? "fa-solid" : "fa-regular";
  const badge = hasSaved
    ? `<span class="nav-badge" aria-label="${savedCount} story tersimpan">${savedCount}</span>`
    : "";

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
