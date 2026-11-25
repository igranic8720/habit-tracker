// small list helpers for the editors
export const moveItem = (list, i, delta) => {
  const j = i + delta
  if (j < 0 || j >= list.length) return list
  const next = [...list]
  ;[next[i], next[j]] = [next[j], next[i]]
  return next
}
export const removeAt = (list, i) => list.filter((_, k) => k !== i)
export const replaceAt = (list, i, item) => list.map((x, k) => (k === i ? item : x))
