export default class BookmarkPresenter {
  #view;
  #model;

  constructor({ view, model }) {
    this.#view = view;
    this.#model = model;
  }

  async loadStories() {
    try {
      this.#view.showLoading();
      //const token = getToken();
      const stories = await this.#model.getAllStories();
      this.#view.showStories(stories);
    } catch (e) {
      this.#view.showError(e.message);
    }
  }
}
