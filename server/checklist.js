import path from 'node:path'
import { DATA, DATE, ID, dataApi, versionOf } from './storage.js'
import { checkFromDisk, checkToDisk } from './diskformat.js'
import { folderFiles, loadFolder, saveFolder } from './folders.js'

// Checklist habits: ticked off by hand, one day at a time (no timer, no target). Kept apart from the timed habits, one JSON
// file each: data/checklist/<id>.json  { id, name, color, archived?, order, checks: { 'YYYY-MM-DD': ms when it was ticked }, notes }.
// A habit is one kind or the other for good: there is no moving between the two stores.
export const CHECK_DIR = path.join(DATA, 'checklist')

const ms = (v) => Number.isInteger(v) && v >= 0 && v <= 4102444800000
const dayMap = (o, ok) => o !== null && typeof o === 'object' && !Array.isArray(o) && Object.entries(o).every(([k, v]) => DATE.test(k) && ok(v))
export function isValid(items) {
  return (
    Array.isArray(items) &&
    new Set(items.map((h) => h?.id)).size === items.length &&
    items.every(
      (h) =>
        h &&
        typeof h.id === 'string' && ID.test(h.id) &&
        typeof h.name === 'string' && h.name.length <= 60 &&
        (h.color === undefined || (typeof h.color === 'string' && h.color.length <= 20)) &&
        (h.archived === undefined || typeof h.archived === 'boolean') &&
        (h.checks === undefined || (dayMap(h.checks, ms) && Object.keys(h.checks).length <= 40000)) &&
        (h.notes === undefined || dayMap(h.notes, (v) => typeof v === 'string' && v.length <= 2000)),
    )
  )
}

const byDay = (o) => Object.fromEntries(Object.entries(o ?? {}).sort(([a], [b]) => a.localeCompare(b)))
const tidy = (h, order) => ({
  id: h.id,
  name: h.name,
  color: h.color,
  ...(h.archived ? { archived: true } : {}),
  order,
  checks: byDay(h.checks),
  notes: byDay(h.notes),
})

// GET /api/checklist -> { items, version }   POST /api/checklist { items, version } -> saves them (see dataApi)
export const checklistApi = dataApi({
  name: 'checklist',
  load: () => ({ items: loadFolder(CHECK_DIR, () => true, 'checklist').map(checkFromDisk) }), // (on disk, by the names on screen: diskformat.js)
  isValid: (d) => isValid(d.items),
  save: (d) => saveFolder(CHECK_DIR, d.items, (h, i) => checkToDisk(tidy(h, i))),
  version: () => versionOf(folderFiles(CHECK_DIR)),
})
