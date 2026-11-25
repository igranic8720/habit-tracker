// shared test helpers: a fresh data folder per test file, and a tiny HTTP server around an API handler
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'

// the stores read HABIT_DATA_DIR when they are first imported, so call this before importing them
export function tempDataDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'habit-tracker-test-'))
  process.env.HABIT_DATA_DIR = dir
  return dir
}

export async function serve(handler) {
  const server = http.createServer(handler)
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const base = `http://127.0.0.1:${server.address().port}`
  return {
    base,
    get: async (p) => (await fetch(base + p)).json(),
    post: async (p, body) => {
      const r = await fetch(base + p, { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body) })
      return { status: r.status, body: await r.json().catch(() => null) }
    },
    close: () => new Promise((r) => server.close(r)),
  }
}

export const ls = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).sort() : [])
