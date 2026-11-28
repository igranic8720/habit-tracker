// Live updates: every open copy of the app keeps one connection to GET /api/events (Server-Sent Events). When a store is saved
// (habits, workouts, time, the calendar cache) the server says so here, and the other devices reload that store, so something
// done on the phone shows up on the desktop straight away. No data is sent this way: only which store changed and its version.
const clients = new Set()
const MAX_CLIENTS = 100 // phones, laptops, tabs: far more than one person needs; it just caps runaway connections

export function eventsApi(req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 405
    return res.end()
  }
  if (clients.size >= MAX_CLIENTS) {
    res.statusCode = 503
    return res.end()
  }
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-store',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // (if a proxy ever sits in front: don't hold the messages back)
  })
  res.write('retry: 3000\n\n') // reconnect 3 s after a dropped connection
  clients.add(res)
  // a comment every 25 s keeps idle connections (and phones) from being cut off
  const ping = setInterval(() => res.write(': ping\n\n'), 25000)
  ping.unref()
  const bye = () => {
    clearInterval(ping)
    clients.delete(res)
  }
  req.on('close', bye)
  res.on('error', bye)
}

// tell every connected device that a store changed: { store: 'habit' | 'checklist' | 'workouts' | 'time' | 'pomodoro' | 'calendar', version }
export function announce(store, version = null) {
  const msg = `event: change\ndata: ${JSON.stringify({ store, version })}\n\n`
  for (const res of clients) res.write(msg)
}

// on shutdown: close the open connections so the server can stop
export function closeAll() {
  for (const res of clients) res.end()
  clients.clear()
}

export const clientCount = () => clients.size
