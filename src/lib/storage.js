// the browser's own storage, for small per-device conveniences (never for your data, which lives on the server).
// It can be unavailable (private browsing, blocked storage), so every read and write is allowed to fail quietly.
export function readStored(store, key) {
  try {
    return JSON.parse(store.getItem(key))
  } catch {
    return null
  }
}
export function writeStored(store, key, value) {
  try {
    if (value === null) store.removeItem(key)
    else store.setItem(key, JSON.stringify(value))
  } catch {
    /* not remembered, nothing else breaks */
  }
}
