import Database from "../../data/database";
import { addStory, getToken } from "../../data/api";

export async function addStoryWithOffline({ description, photo, lat, lon }) {
  const token = getToken();
  if (!token) throw new Error("Harus login dulu");

  const payload = { description, photo, lat, lon };
  
  if (!navigator.onLine) {
    await Database.putPendingStory(payload);
    return { offline: true, message: 'Story disimpan offline dan akan dikirim saat online.' };
  }

  try {
    const result = await addStory(payload);
    return { offline: false, ...result };
  } catch (e) {
    await Database.putPendingStory(payload);
    return { offline: true, message: 'Gagal kirim ke server, disimpan offline dulu.' };
  }
}