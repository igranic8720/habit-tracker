// the production server (server/index.js) as a real process: pages, assets, the API, path safety and shutdown.
// It serves the built app, so it is skipped until `npm run build` has been run.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import { after, before, test } from 'node:test'
import { tempDataDir } from '../helpers.js'

const built = fs.existsSync(new URL('../../dist/index.html', import.meta.url))
let child
let base

before(async () => {
  if (!built) return
  child = spawn(process.execPath, ['server/index.js'], { env: { ...process.env, PORT: '0', HOST: '127.0.0.1', HABIT_DATA_DIR: tempDataDir() } })
  base = await new Promise((resolve, reject) => {
    child.stdout.on('data', (b) => {
      const m = String(b).match(/http:\/\/[\d.]+:(\d+)/)
      if (m) resolve(`http://127.0.0.1:${m[1]}`)
    })
    child.on('exit', () => reject(new Error('server exited')))
  })
})
after(() => child?.kill())

const get = (p, init) => fetch(base + p, init)

test('pages, assets and health check', { skip: !built && 'run npm run build first' }, async () => {
  const home = await get('/')
  assert.equal(home.status, 200)
  assert.match(home.headers.get('content-type'), /text\/html/)
  assert.equal(home.headers.get('cache-control'), 'no-cache')
  assert.equal(home.headers.get('x-content-type-options'), 'nosniff')
  assert.equal((await get('/healthz')).status, 200)
  assert.equal((await get('/workouts/plans')).status, 200) // an app path without a file extension gets the app
  assert.equal((await get('/missing.js')).status, 404)
  const asset = fs.readdirSync(new URL('../../dist/assets/', import.meta.url)).find((n) => n.endsWith('.js'))
  const a = await get(`/assets/${asset}`)
  assert.equal(a.status, 200)
  assert.match(a.headers.get('cache-control'), /immutable/)
  assert.equal((await get('/', { method: 'HEAD' })).status, 200)
})

test('no way out of dist/, and bad requests are refused', { skip: !built && 'run npm run build first' }, async () => {
  assert.equal((await get('/%2e%2e%2fpackage.json')).status, 403)
  assert.equal((await get('/%2e%2e%2f%2e%2e%2fetc%2fpasswd')).status, 403)
  assert.equal((await get('/a%00b')).status, 400)
  assert.equal((await get('/%E0%A4%A')).status, 400)
  assert.equal((await get('/', { method: 'DELETE' })).status, 405)
})

test('the data API is served, and a save without a version is refused', { skip: !built && 'run npm run build first' }, async () => {
  const body = await (await get('/api/habit')).json()
  assert.deepEqual(body.habits, [])
  assert.equal((await get('/api/habit', { method: 'POST', body: JSON.stringify({ habits: [] }) })).status, 409)
  assert.ok(Array.isArray((await (await get('/api/workouts')).json()).plans))
})

test('stops cleanly on SIGTERM (docker stop)', { skip: !built && 'run npm run build first' }, async () => {
  const code = await new Promise((resolve) => {
    child.on('exit', resolve)
    child.kill('SIGTERM')
  })
  assert.equal(code, 0)
  child = null
})
