import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

// pieces shared by the habit store and the workout store: where data lives, safe writes, and reading a JSON request
export const DATA = path.resolve(process.env.HABIT_DATA_DIR ?? 'data')
export const ID = /^[A-Za-z0-9_-]{1,64}$/ // ids become file names / references, so keep them safe (no path separators)
export const DATE = /^\d{4}-\d{2}-\d{2}$/
const MAX_BODY = 5 * 1024 * 1024 // a year of notes is far below this; it just stops runaway requests

// write to a temp file, then rename: a crash mid-write can never leave a half-written file
export function writeAtomic(file, text) {
  const tmp = `${file}.tmp-${process.pid}`
  fs.writeFileSync(tmp, text)
  fs.renameSync(tmp, file)
}

// a short fingerprint of some files' contents: it changes whenever any of them does (missing files count as empty)
export function versionOf(files) {
  const hash = createHash('sha1')
  for (const file of [...files].sort()) {
    hash.update(path.basename(file) + '\0')
    try {
      hash.update(fs.readFileSync(file))
    } catch {
      /* missing: nothing to add */
    }
    hash.update('\0')
  }
  return hash.digest('hex').slice(0, 16)
}

// reads a (size-capped) JSON request body and replies with whatever handle(parsed) returns ({ ok: true } by default);
// 400 when the body is bad or handle throws, 413 when too big
export function withJsonBody(req, res, handle) {
  let body = ''
  let tooBig = false
  req.on('data', (chunk) => {
    if (tooBig) return
    body += chunk
    if (body.length > MAX_BODY) {
      tooBig = true
      res.statusCode = 413
      res.setHeader('Connection', 'close')
      res.end('{"ok":false}')
    }
  })
  req.on('end', () => {
    if (tooBig) return
    try {
      res.end(JSON.stringify(handle(JSON.parse(body)) ?? { ok: true }))
    } catch {
      res.statusCode = 400
      res.end('{"ok":false}')
    }
  })
}

// GET -> { ...load(), version }    POST { ...data, version } -> saves it, replies { ok, version }
// The version is a fingerprint of the files on disk. A save must name the version it started from: if the files changed
// since (another device or tab saved first), it is refused with 409 and nothing is written, so a stale copy can never
// overwrite newer data. The app then reloads the newer data.
// A plain (req, res) handler, used by both the Vite dev server (dev-plugin.js) and the production server (index.js).
export function dataApi({ load, isValid, save, version }) {
  return (req, res) => {
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Cache-Control', 'no-store')
    if (req.method === 'GET') {
      const data = load() // (may migrate older files first, so the version is taken after)
      res.end(JSON.stringify({ ...data, version: version() }))
    } else if (req.method === 'POST') {
      withJsonBody(req, res, ({ version: base, ...data }) => {
        if (base !== version()) {
          res.statusCode = 409
          return { ok: false, conflict: true }
        }
        if (!isValid(data)) throw new Error('invalid data')
        save(data)
        return { ok: true, version: version() }
      })
    } else {
      res.statusCode = 405
      res.end()
    }
  }
}
