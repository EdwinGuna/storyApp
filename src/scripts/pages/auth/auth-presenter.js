import { saveToken, saveProfile } from "../../data/api.js";
import { sleep } from "../../utils/index.js";

export default class AuthPresenter {
  #viewLogin;
  #modelLogin;
  #viewRegister;
  #modelRegister;

  constructor({ viewRegister, modelRegister, viewLogin, modelLogin }) {
    this.#modelRegister = modelRegister;
    this.#viewRegister = viewRegister;
    this.#modelLogin = modelLogin;
    this.#viewLogin = viewLogin;
  }

  async submitRegister() {
    try {
      const data = this.#viewRegister.getFormData();
      if (data.password !== data.confirm) {
        this.#viewRegister.showError("konfirmasi password tidak cocok!");
        return;
      }
      this.#viewRegister.showLoading();

      await this.#modelRegister.register(data);
      this.#viewRegister.showSuccess("Registrasi berhasil. Silahkan login.");
      await sleep();
      this.#viewRegister.clearLoading();
      this.#viewRegister.navigateTo?.("#/login");
    } catch (e) {
      this.#viewRegister.showError(e.message || "Gagal registrasi");
    }
  }

  async submitLogin() {
    try {
      const data = this.#viewLogin.getFormData();
      this.#viewLogin.showLoading();

      const res = await this.#modelLogin.login(data);

      const token = res?.accessToken || res?.token || res?.loginResult?.token;

      if (!token) throw new Error("Token login tidak diketemukan");

      saveToken(token);

      const { name, email } = res?.loginResult || {};
      const identity = (name && name.trim()) || email || data.email || "User";
      saveProfile({ name: identity, email: email || data.email });

      this.#viewLogin.setAuthState(true);
      await this.#viewLogin.refreshAuthUI();
      //this.#viewLogin.updateUserLogin(identity);

      this.#viewLogin.showSuccess("Login sukses");
      await sleep();
      this.#viewLogin.clearLoading();
      this.#viewLogin.navigateTo?.("#/stories");
    } catch (e) {
      this.#viewLogin.showError(e.message || "Gagal login");
    }
  }
}
