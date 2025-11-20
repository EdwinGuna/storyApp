import { getToken } from "../../data/api.js";

export default class StoryPresenter {
  #model;
  #view;
  #asGuest;

  constructor({ model, view, asGuest = false }) {
    this.#model = model;
    this.#view = view;
    this.#asGuest = asGuest;
  }

  async submitAddStory() {
    try {
      const data = this.#view.getFormData();
      // validasi file
      if (!(data.photo instanceof File)) throw new Error("Foto wajib diisi");
      if (!/^image\//.test(data.photo.type))
        throw new Error("File harus gambar");
      if (data.photo.size > 1024 * 1024)
        throw new Error("Ukuran foto maksimal 1MB");

      this.#view.showLoading();

      const hasToken = !!getToken();
      const useGuest = this.#asGuest || !hasToken;

      const result = await (useGuest
        ? this.#model.addStoryAsGuest(data)
        : this.#model.addStory(data));

      if (!useGuest && result && result.offline) {
        this.#view.showSuccess(
          result.message ||
            "Story disimpan offline dan akan dikirim saat koneksi kembali.",
        );
      } else {
        this.#view.showSuccess(
          result?.message || "Story berhasil ditambahkan!",
        );
      }
    } catch (e) {
      this.#view.showError(e.message || "Gagal menambah story");
    }
  }
}
