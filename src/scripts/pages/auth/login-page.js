import { login } from "./../../data/api";
import AuthPresenter from "../../pages/auth/auth-presenter.js";
import { refreshPushButton } from "../../index.js";

export default class LoginPage {
  #presenter;

  async render() {
    return `
      <section class="container auth auth--login">
        <h1 class="auth__title">Login</h1>

        <form id="login-form" class="auth-form card" novalidate>
          <label class="auth-field" for="email">
            <span>Email</span>
            <input id="email" name="email" type="email" required autocomplete="email" inputmode="email" />
          </label>

          <label class="auth-field" for="password">
            <span>Password</span>
            <input id="password" name="password" type="password" required autocomplete="current-password" />
          </label>

          <button type="submit" class="btn btn--primary auth-submit">Masuk</button>

          <p id="login-msg" class="form-status sr-only" role="status" aria-live="polite"></p>
        </form>

        <p class="auth__switch muted">Belum punya akun? <a href="#/register">Register</a></p>
      </section>
    `;  
  }

  async afterRender() {
    this.#presenter = new AuthPresenter({
      modelLogin: { login },
      viewLogin: this,
    });
    this.mountLogin();
  }

  mountLogin() {
    const form = document.getElementById("login-form");
    form?.addEventListener("submit", (e) => {
      e.preventDefault();
      this.#presenter.submitLogin();
    });
  }

  setAuthState(isAuth) {
    document.documentElement.classList.toggle("isAuth", isAuth);
  }

  async refreshAuthUI() {
    await refreshPushButton();
  }

  navigateTo(hash) {
    location.hash = hash;
  }

  getFormData() {
    return {
      email: document.getElementById("email").value.trim(),
      password: document.getElementById("password").value.trim(),
    };
  }

  showLoading(msg = "Memproses ...") {
    const el = document.getElementById("login-msg");
    if (el) {
      el.classList.remove("sr-only", "is-success", "is-error");
      el.textContent = msg;
    }
  }

  showError(msg) {
    const el = document.getElementById("login-msg");
    if (el) {
      el.classList.remove("sr-only", "is-success");
      el.classList.add("is-error");
      el.textContent = msg;
    }
  }

  showSuccess(msg) {
    const el = document.getElementById("login-msg");
    if (el) {
      el.classList.remove("sr-only", "is-error");
      el.classList.add("is-success");
      el.textContent = msg;
    }
  }

  clearLoading() {
    const el = document.getElementById("login-msg");
    if (el) {
      el.textContent = "";
      el.classList.add("sr-only");
      el.classList.remove("is-success", "is-error");
    }
  }
}
