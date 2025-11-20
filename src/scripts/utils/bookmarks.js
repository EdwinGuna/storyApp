export function getSavedCount() {
  try {
    const raw = localStorage.getItem("bookmarks") || "[]";
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.length : 0;
  } catch {
    return 0;
  }
}
