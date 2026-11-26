// live updates: a save is announced to every connected device (store name and new version only, never the data)
import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { serve, tempDataDir } from '../helpers.js'

tempDataDir()
const { habitApi } = await import('../../server/habits.js')
const { eventsApi, clientCount, closeAll } = await import('../../server/events.js')
const api = await serve((req, res) => (req.url.startsWith('/api/events') ? eventsApi(req, res) : habitApi(req, res)))
after(async () => {
  closeAll()
  await api.close()
})

// open the event stream; next() resolves with the next 'change' message
async function listen() {
  const ctrl = new AbortController()
  const r = await fetch(api.base + '/api/events', { signal: ctrl.signal })
  assert.equal(r.headers.get('content-type'), 'text/event-stream; charset=utf-8')
  const reader = r.body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  return {
    async next() {
      for (;;) {
        const m = buf.match(/event: change\ndata: (.*)\n\n/)
        if (m) {
          buf = buf.slice(m.index + m[0].length)
          return JSON.parse(m[1])
        }
        const { value, done } = await reader.read()
        if (done) throw new Error('stream ended')
        buf += dec.decode(value)
      }
    },
    close: () => ctrl.abort(),
  }
}

test('a save is announced to every connected device, with the new version', async () => {
  const phone = await listen()
  const desktop = await listen()
  assert.equal(clientCount(), 2)
  const { version } = await api.get('/api/habit')
  const r = await api.post('/api/habit', { habits: [{ id: 'read', name: 'Read', color: 'red', days: [], notes: {} }], version })
  assert.equal(r.status, 200)
  for (const device of [phone, desktop]) assert.deepEqual(await device.next(), { store: 'habit', version: r.body.version })
  phone.close()
  desktop.close()
})

test('a refused save (out of date, or bad data) announces nothing', async () => {
  const device = await listen()
  assert.equal((await api.post('/api/habit', { habits: [], version: 'stale' })).status, 409)
  const { version } = await api.get('/api/habit')
  assert.equal((await api.post('/api/habit', { habits: 'nope', version })).status, 400)
  const ok = await api.post('/api/habit', { habits: [], version })
  assert.deepEqual(await device.next(), { store: 'habit', version: ok.body.version }) // the first message is the good save
  device.close()
})

test('a closed connection is forgotten; only GET is allowed', async () => {
  await new Promise((r) => setTimeout(r, 50))
  assert.equal(clientCount(), 0)
  assert.equal((await fetch(api.base + '/api/events', { method: 'POST' })).status, 405)
})
