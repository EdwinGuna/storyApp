import Database from "../../data/database";
import { addStory, getToken } from "../../data/api";

export async function syncPendingStories() {
  if (!navigator.onLine) return;

  const token = getToken();
  if (!token) {
    console.warn("Tidak ada token. Tidak bisa sync pending stories.");
    return;
  }

  const pendingList = await Database.getAllPendingStories();
  if (!pendingList.length) {
    console.log("Tidak ada pending story untuk disinkronkan!");
    return;
  }

  console.log(`Mulai sync pending stories: ${pendingList.length} buah story`);

  for (const draft of pendingList) {
    const { localId, description, photo, lat, lon } = draft;

    try {
      await addStory({ description, photo, lat, lon });

      await Database.removePendingStory(localId);
      console.log("Berhasil sync pending story:", localId);
    } catch (e) {
        console.error("Gagal sync pending story:", localId, e);
    }
  }

  const sisa = await Database.getAllPendingStories();
  console.log("Sisa pending-stories setelah sync:", sisa);
}