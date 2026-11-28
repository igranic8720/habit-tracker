import fs from 'node:fs'
import path from 'node:path'
import { writeAtomic } from './storage.js'

// a list kept as one JSON file per item, <dir>/<id>.json, in the list's order (each file has an `order`).
// Used by the habit store (data/habits) and the checklist store (data/checklist).

// write each item through tidy(item, order); an untouched file isn't rewritten, and an item gone from the list is moved to
// <dir>/.deleted, never unlinked (and never over an earlier copy)
export function saveFolder(dir, items, tidy) {
  fs.mkdirSync(dir, { recursive: true })
  const keep = new Set()
  items.forEach((item, i) => {
    const name = `${item.id}.json`
    keep.add(name)
    const text = JSON.stringify(tidy(item, i), null, 2) + '\n'
    const file = path.join(dir, name)
    if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== text) writeAtomic(file, text)
  })
  for (const name of fs.readdirSync(dir)) {
    if (name.endsWith('.json') && !keep.has(name)) moveAside(dir, name)
  }
}

// move <dir>/<name> into <dir>/.deleted
export function moveAside(dir, name) {
  const aside = path.join(dir, '.deleted')
  fs.mkdirSync(aside, { recursive: true })
  const to = path.join(aside, fs.existsSync(path.join(aside, name)) ? `${name}.${Date.now()}` : name)
  fs.renameSync(path.join(dir, name), to)
}

// every readable item (keep(item) picks which), in order
export function loadFolder(dir, keep = () => true, label = path.basename(dir)) {
  if (!fs.existsSync(dir)) return []
  const items = []
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.json')) continue
    try {
      const item = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'))
      if (keep(item)) items.push(item)
    } catch {
      console.warn(`[${label}] skipping unreadable file ${name}`)
    }
  }
  return items.sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))
}

// the files that make up the folder's version
export const folderFiles = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((n) => n.endsWith('.json')).map((n) => path.join(dir, n)) : [])
