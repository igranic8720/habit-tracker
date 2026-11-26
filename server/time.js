import fs from 'node:fs'
import path from 'node:path'
import { DATA, ID, backup, dataApi, versionOf, writeAtomic } from './storage.js'

// Time tracking lives in data/time/sessions.json:
//   { running: null | { kind, ref, label, color, start }, sessions: [{ id, kind, ref, label, color, start, end }] }
// kind is 'habit' | 'workout' | 'other'; ref is the habit's id (or null); start/end are milliseconds since 1970 (UTC).
// The running timer is saved too, so it keeps counting if you close the app or switch device.
const DIR = path.join(DATA, 'time')
const FILE = path.join(DIR, 'sessions.json')

const COLORS = ['red', 'orange', 'yellow', 'blue', 'violet', 'white', 'pink', 'cyan', 'brown', 'magenta', 'sky', 'navy', 'wine', 'peach', 'green', 'lime', 'teal', 'mint', 'olive', 'forest', 'lavender', 'plum', 'slate', 'maroon', 'sand', 'rust', 'steel', 'salmon', 'gray'] // the palette in src/lib/habits.js, plus neutral gray
const KINDS = ['habit', 'workout', 'other']
const MAX_SESSION = 7 * 24 * 3600 * 1000
const MAX_MS = 4102444800000 // year 2100
const ms = (v) => Number.isInteger(v) && v >= 0 && v <= MAX_MS

const validBase = (s) =>
  s && KINDS.includes(s.kind) && (s.ref == null || (typeof s.ref === 'string' && ID.test(s.ref))) &&
  typeof s.label === 'string' && s.label.length >= 1 && s.label.length <= 80 && COLORS.includes(s.color) && ms(s.start)
const validSession = (s) => validBase(s) && typeof s.id === 'string' && ID.test(s.id) && ms(s.end) && s.end >= s.start && s.end - s.start <= MAX_SESSION

export const isValid = (d) =>
  d !== null && typeof d === 'object' &&
  (d.running == null || validBase(d.running)) &&
  Array.isArray(d.sessions) && d.sessions.length <= 50000 && d.sessions.every(validSession) &&
  new Set(d.sessions.map((s) => s.id)).size === d.sessions.length

function save(d) {
  fs.mkdirSync(DIR, { recursive: true })
  const sessions = [...d.sessions].sort((a, b) => a.start - b.start || a.id.localeCompare(b.id))
  const text = JSON.stringify({ running: d.running ?? null, sessions }, null, 2) + '\n'
  if (fs.existsSync(FILE) && fs.readFileSync(FILE, 'utf8') === text) return
  backup(DIR, 'sessions.json')
  writeAtomic(FILE, text)
}

function load() {
  try {
    const d = JSON.parse(fs.readFileSync(FILE, 'utf8'))
    return { running: d.running ?? null, sessions: d.sessions ?? [] }
  } catch {
    return { running: null, sessions: [] }
  }
}

// GET /api/time -> { running, sessions, version }   POST the same -> saves it (see dataApi)
export const timeApi = dataApi({ name: 'time', load, isValid, save, version: () => versionOf([FILE]) })
