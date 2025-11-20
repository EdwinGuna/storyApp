import CONFIG from "../config.js";
import { addStoryWithOffline } from "../utils/offline/addStoryOffline.js";
import Database from "./database.js";

const ENDPOINTS = {
  REGISTER: `${CONFIG.BASE_URL}/register`,
  LOGIN: `${CONFIG.BASE_URL}/login`,
  STORIES: `${CONFIG.BASE_URL}/stories`,
  STORIES_PENDING: `${CONFIG.BASE_URL}/stories/pending`,
  STORIES_GUEST: `${CONFIG.BASE_URL}/stories/guest`,
  NOTIF_SUBSCRIBE: `${CONFIG.BASE_URL}/notifications/subscribe`,
};

async function handleJson(res) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error)
    throw new Error(json.message || res.statusText || "Request error");
  return json;
}

export async function register({ name, email, password }) {
  const res = await fetch(ENDPOINTS.REGISTER, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  return handleJson(res); // {error:false,message:"User Created"}
}

export async function login({ email, password }) {
  const res = await fetch(ENDPOINTS.LOGIN, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handleJson(res);
}

export async function getStories(
  token,
  { page = 1, size = 10, location = 0 } = {},
) {
  if (!token) throw new Error("Harus login dulu (token kosong).");

  const url = `${ENDPOINTS.STORIES}?page=${page}&size=${size}&location=${location}`;

  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok || json.error) {
    throw new Error(json.message || "Gagal mengambil stories");
  }
  console.log(json);
  return json;
}

export async function addStory({ description, photo, lat, lon }) {
    const token = getToken();
    if (!token) throw new Error("Harus login dulu");

    const draft = { description, photo, lat, lon };

    if (!navigator.onLine) {
      await Database.putPendingStory(draft);
      return {
        offline: true,
        message: "Koneksi tidak tersedia. Story disimpan offline dan akan dikirim saat online.",
      };
    }

    const formData = new FormData();
    formData.append("description", description);
    formData.append("photo", photo);
    if (lat) formData.append("lat", lat);
    if (lon) formData.append("lon", lon);

    try {
      const res = await fetch(ENDPOINTS.STORIES, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const json = await handleJson(res);

      return {
        offline: false,
        ...json,
      };
    } catch (error) {
      console.error('addStory error, menyimpan ke pending-stories', error);
      await Database.putPendingStory(draft);
      
      return {
        offline: true,
        message: 'Story Gagal dikirim ke server(mungkin jaringan bermasalah). Disimpan offline dan akan dikirim ketika online.',
      };
    }
}  

export async function addStoryAsGuest({ description, photo, lat, lon }) {
  const formData = new FormData();
  formData.append("description", description);
  formData.append("photo", photo);
  if (lat) formData.append("lat", lat);
  if (lon) formData.append("lon", lon);

  const res = await fetch(ENDPOINTS.STORIES_GUEST, {
    method: "POST",
    body: formData,
  });
  return handleJson(res);
}

export async function getDetailStory(id, token = getToken()) {
  if (!token) throw new Error("Harus login dulu (token kosong).");
  if (!id) throw new Error("Harus pilih dulu story yang ingin dilihat!");

  const url = `${ENDPOINTS.STORIES}/${encodeURIComponent(id)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error)
    throw new Error(json.message || "Gagal memuat detail");
  return json.story;
}

export async function subscribeNotification(sub, token = getToken()) {
  if (!token) throw new Error("Harus login dulu (token kosong)!");
  if (!sub) throw new Error("Subscription tidak ditemukan!");

  const subJSON = sub.toJSON ? sub.toJSON() : sub;
  const endpoint = subJSON.endpoint;
  const p256dh = subJSON.keys?.p256dh;
  const auth = subJSON.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    throw new Error("Data subscription tidak lengkap (endpoint/p256dh/auth).");
  }

  const res = await fetch(ENDPOINTS.NOTIF_SUBSCRIBE, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ endpoint, keys: { p256dh, auth } }),
  });
  return handleJson(res);
}

export async function unsubscribeNotification(endpoint, token = getToken()) {
  if (!token) throw new Error("Harus login dulu (token kosong)!");
  const res = await fetch(ENDPOINTS.NOTIF_SUBSCRIBE, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ endpoint }),
  });

  let data = null;
  try {
    data = await res.clone().json();
    // eslint-disable-next-line no-empty
  } catch {}

  if (!res.ok) {
    const msg = data?.message || res.statusText || "Unsubscribe failed";
    throw new Error(msg);
  }

  return (
    data ?? {
      error: false,
      message: "Success to unsubscribe web push notification.",
    }
  );
}

// util token
export const saveToken = (t) => localStorage.setItem("token", t);
export const getToken = () => localStorage.getItem("token") || "";
export const clearToken = () => localStorage.removeItem("token");

export const saveProfile = (p) =>
  localStorage.setItem("profile", JSON.stringify(p || {}));

export const getProfile = () => {
  try {
    return JSON.parse(localStorage.getItem("profile") || "{}");
  } catch {
    return {};
  }
};

export const clearProfile = () => localStorage.removeItem("profile");
