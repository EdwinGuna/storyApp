import {
  subscribeNotification,
  unsubscribeNotification,
  getToken,
} from "./data/api.js";

const VAPID =
  "BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk";

const b64ToU8 = (b64) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const s = (b64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
};

export async function bindExistingPushToToken(token = getToken()) {
  if (!token) return "guest";
  if (!("serviceWorker" in navigator) || !("PushManager" in window))
    return "unsupported";
  if (Notification.permission !== "granted") return "denied";

  const reg = await registerSW();
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return "off"; // belum ada subscription di browser ini

  await subscribeNotification(sub, token); // kaitkan ke akun yg sedang login
  localStorage.setItem("webpush:endpoint", sub.endpoint);
  return "on";
}

async function registerSW() {
  if (!("serviceWorker" in navigator))
    throw new Error("Service Worker tidak didukung.");
  let reg = await navigator.serviceWorker.getRegistration(); // pakai scope root
  if (!reg) {
    reg = await navigator.serviceWorker.register("./sw.bundle.js");
  }
  try {
    await reg.update();
    // eslint-disable-next-line no-empty
  } catch {}
  return navigator.serviceWorker.ready; // pastikan ready
}

export async function enableWebPush(token = getToken()) {
  if (!("PushManager" in window))
    throw new Error("Push API tidak didukung browser ini.");

  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("Izin notifikasi ditolak.");

  const reg = await registerSW();

  const existing = await reg.pushManager.getSubscription();
  const sub =
    existing ||
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: b64ToU8(VAPID),
    }));

  try {
    const res = await subscribeNotification(sub, token); // POST ke server
    console.log("[push] subscribe -> server OK", sub.endpoint, res);
    localStorage.setItem("webpush:endpoint", sub.endpoint);
    return "on";
  } catch (e) {
    console.warn("[push] subscribe -> server FAIL", e);
    if (!existing) {
      try {
        await sub.unsubscribe();
        // eslint-disable-next-line no-empty
      } catch {}
    }
    throw e;
  }
}

export async function disableWebPush(token = getToken()) {
  const reg = await registerSW();
  const sub = await reg?.pushManager.getSubscription();
  const endpoint = sub?.endpoint || localStorage.getItem("webpush:endpoint");

  if (endpoint) {
    try {
      const response = await unsubscribeNotification(endpoint, token);
      console.log(JSON.stringify(response));
    } catch (e) {
      console.warn("[push] server unsubscribe WARN: ", e.message || e);
    }
  }
  try {
    await sub?.unsubscribe();
    // eslint-disable-next-line no-empty
  } catch {}
  localStorage.removeItem("webpush:endpoint");
  return "off";
}

export async function getPushState() {
  if (!getToken()) return "guest";
  if (!("serviceWorker" in navigator) || !("PushManager" in window))
    return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const reg = await registerSW();
  const sub = await reg?.pushManager.getSubscription();
  return sub ? "on" : "off";
}
