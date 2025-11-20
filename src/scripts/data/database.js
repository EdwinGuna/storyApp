import { openDB } from "idb";

const DATABASE_NAME = "storyapp";
const DATABASE_VERSION = 2;

const OBJECT_STORE_NAME = "saved-stories";
const OBJECT_STORE_PENDING = "pending-stories";

const dbPromise = openDB(DATABASE_NAME, DATABASE_VERSION, {
  upgrade(database) {
    if (!database.objectStoreNames.contains(OBJECT_STORE_NAME)) {
      database.createObjectStore(OBJECT_STORE_NAME, { keyPath: "id" });
    }
    if (!database.objectStoreNames.contains(OBJECT_STORE_PENDING)) {
      database.createObjectStore(OBJECT_STORE_PENDING, {
        keyPath: "localId",
        autoIncrement: true,
      });
    }
  },
});

const Database = {
  async putStory(story) {
    if (!Object.hasOwn(story, "id")) {
      throw new Error("`id` is required to save.");
    }

    return (await dbPromise).put(OBJECT_STORE_NAME, story);
  },

  async getStoryById(id) {
    if (!id) {
      throw new Error("`id` is required.");
    }

    return (await dbPromise).get(OBJECT_STORE_NAME, id);
  },

  async getAllStories() {
    return (await dbPromise).getAll(OBJECT_STORE_NAME);
  },

  async removeStory(id) {
    return (await dbPromise).delete(OBJECT_STORE_NAME, id);
  },

  async putPendingStory(draft) {
    /*if (!Object.hasOwn(draft, 'localId')) {
      throw new Error('`localId` is required to save.');
    }*/

    return (await dbPromise).add(OBJECT_STORE_PENDING, {
      ...draft,
      createdAt: draft.createdAt || new Date().toISOString(),
      synced: false,
    });
  },

  async getPendingStoryById(localId) {
    if (!localId) {
      throw new Error("`localId` is required.");
    }

    return (await dbPromise).get(OBJECT_STORE_PENDING, localId);
  },

  async getAllPendingStories() {
    return (await dbPromise).getAll(OBJECT_STORE_PENDING);
  },

  async removePendingStory(localId) {
    const key = typeof localId === "string" ? Number(localId) : localId;
    return (await dbPromise).delete(OBJECT_STORE_PENDING, key);
  },
};

export default Database;
