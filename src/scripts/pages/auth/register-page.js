import { register } from "../../data/api.js";
import AuthPresenter from "../../pages/auth/auth-presenter.js";

export default class RegisterPage {
  #presenter;

  async render() {
    return `
      <section class="container auth auth--register">
        <h1 class="auth__title">Register</h1>

        <form id="register-form" class="auth-form card" aria-describedby="reg-help" novalidate>
          <label class="auth-field" for="username">
            <span>Name</span>
            <input id="username" name="name" required autocomplete="name" />
          </label>

          <label class="auth-field" for="email">
            <span>Email</span>
            <input id="email" name="email" type="email" required autocomplete="email" inputmode="email" />
          </label>

          <label class="auth-field" for="password">
            <span>Password</span>
            <input id="password" name="password" type="password" minlength="8" required autocomplete="new-password" />
          </label>

          <label class="auth-field" for="confirm">
            <span>Konfirmasi</span>
            <input id="confirm" name="confirm" type="password" minlength="8" required autocomplete="new-password" />
          </label>

          <p id="reg-help" class="help-text">Password minimal 8 karakter.</p>

          <button type="submit" class="btn btn--primary auth-submit">Daftar</button>

          <p id="register-msg" class="form-status sr-only" aria-live="polite" role="status"></p>
        </form>

        <p class="auth__switch muted">Sudah punya akun? <a href="#/login">Login</a></p>
      </section>
    `;  
  }

  async afterRender() {
    this.#presenter = new AuthPresenter({
      modelRegister: { register },
      viewRegister: this,
    });
    this.mountRegister();
  }

  mountRegister() {
    const form = document.getElementById("register-form");
    form?.addEventListener("submit", (e) => {
      e.preventDefault();
      this.#presenter.submitRegister();
    });
  }

  getFormData() {
    return {
      name: document.getElementById("username").value.trim(),
      email: document.getElementById("email").value.trim(),
      password: document.getElementById("password").value.trim(),
      confirm: document.getElementById("confirm").value.trim(),
    };
  }

  showLoading(msg = "Mendaftarkan akun ...") {
    const el = document.getElementById("register-msg");
    if (el) {
      el.classList.remove("sr-only", "is-success", "is-error");
      el.textContent = msg;
    }
  }

  clearLoading() {
    const el = document.getElementById("register-msg");
    if (el) {
      el.textContent = "";
      el.classList.add("sr-only");
      el.classList.remove("is-success", "is-error");
    }
  }

  showError(msg) {
    const el = document.getElementById("register-msg");
    if (el) {
      el.classList.remove("sr-only", "is-success");
      el.classList.add("is-error");
      el.textContent = msg;
    }
  }

  showSuccess(msg) {
    const el = document.getElementById("register-msg");
    if (el) {
      el.classList.remove("sr-only", "is-error");
      el.classList.add("is-success");
      el.textContent = msg;
    }
  }

  navigateTo(hash) {
    location.hash = hash;
  }
}
