import { getToken } from "../../data/api.js";

export default class HomePresenter {
  #model;
  #view;

  constructor({ model, view }) {
    this.#model = model;
    this.#view = view;
  }

  async loadStories() {
    try {
      this.#view.showLoading();
      const token = getToken();
      const { listStory = [] } = await this.#model.getStories(token, {
        page: 1,
        size: 10,
        location: 0,
      });
      this.#view.showStories(listStory);
    } catch (e) {
      this.#view.showError(e.message);
    }
  }
}
