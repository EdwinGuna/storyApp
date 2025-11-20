import { getToken } from "../../data/api.js";

export default class DetailPresenter {
  #storyId;
  #model;
  #view;
  #dbModel;
 
  constructor({ storyId, model, view, dbModel }) {
    this.#storyId = storyId;
    this.#model = model;
    this.#view = view;
    this.#dbModel = dbModel;
  }

   async loadStory(id) {
    try {
      this.#view.showLoading();
      const token = getToken();
      const story = await this.#model.getDetailStory(id, token);
      this.#view.showDetail(story);
    } catch (e) {
      this.#view.showError(e.message);
    }
  }

  async saveStory() {
    try {
      const story = await this.#model.getDetailStory(this.#storyId);
      await this.#dbModel.putStory(story);

      this.#view.saveToBookmarkSuccessfully('Success to save to bookmark');
    } catch (error) {
      console.error('saveReport: error:', error);
      this.#view.saveToBookmarkFailed(error.message);
    }
  }

  async removeStory() {
    try {
      await this.#dbModel.removeStory(this.#storyId);

      this.#view.removeFromBookmarkSuccessfully('Success to remove from bookmark');
    } catch (error) {
      console.error('removeReport: error:', error);
      this.#view.removeFromBookmarkFailed(error.message);
    }
  }

  async showSaveButton() {
    if (await this.#isStorySaved()) {
      this.#view.renderRemoveButton();
      return;
    }

    this.#view.renderSaveButton();
  }

  async #isStorySaved() {
    return !!(await this.#dbModel.getStoryById(this.#storyId));
  }
  
}
