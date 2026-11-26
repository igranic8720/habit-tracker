import { useCallback, useEffect, useRef, useState } from 'react'
import { DATA_CHANGE } from './useLiveUpdates.js'

// Loads one document from the API, then saves it back after every change. The rules that keep your data safe:
//  - nothing is saved until a load has succeeded (a failed load can never overwrite what is on disk)
//  - changes are debounced, and only one request is on the wire at a time, so saves land in order
//  - every save names the version it started from; if another device or tab saved first the server refuses it (409)
//    and the newer data is loaded instead of being overwritten
//  - pending changes are sent straight away when the app is hidden (switching apps on a phone can freeze the page)
//  - a change saved on another device is loaded as soon as the server announces it (live updates), unless this copy is in the
//    middle of saving its own change: that save is checked against the server's version, so it never overwrites the newer one
// fromServer(body) -> data;  toServer(data) -> body;  fix(data) -> [data, needsSave] tidies freshly loaded data
export function useAutosave(url, { fromServer, toServer, fix = (d) => [d, false], delay = 300 }) {
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ready | failed
  const [saveState, setSaveState] = useState('idle') // idle | saving | saved | error | conflict
  const version = useRef(null) // the server version our data is based on
  const dirty = useRef(false) // changes not sent yet
  const latest = useRef(null) // the data to send
  const inFlight = useRef(null) // the request on the wire, if any
  const timer = useRef(null)
  const opts = useRef({ fromServer, toServer, fix })

  const load = useCallback(async () => {
    try {
      const r = await fetch(url, { cache: 'no-store' })
      if (!r.ok) throw new Error(r.status)
      const body = await r.json()
      const [fixed, needsSave] = opts.current.fix(opts.current.fromServer(body))
      version.current = body.version
      latest.current = fixed
      dirty.current = needsSave
      setData(fixed)
      setStatus('ready')
    } catch {
      setStatus((s) => (s === 'ready' ? s : 'failed'))
    }
  }, [url])

  // send what is pending: waits for any request already on the wire, so saves never overtake each other
  const flush = useCallback(async () => {
    clearTimeout(timer.current)
    while (inFlight.current) await inFlight.current
    if (!dirty.current || version.current === null) return
    dirty.current = false
    const body = JSON.stringify({ ...opts.current.toServer(latest.current), version: version.current })
    setSaveState('saving')
    inFlight.current = (async () => {
      try {
        const r = await fetch(url, { method: 'POST', body, keepalive: body.length < 60000 }) // keepalive: survives the page closing
        if (r.ok) {
          version.current = (await r.json()).version
          setSaveState(dirty.current ? 'saving' : 'saved')
        } else if (r.status === 409) {
          setSaveState('conflict') // changed elsewhere first: show the newer data rather than overwrite it
          await load()
        } else {
          dirty.current = true // kept, and sent again with the next change or when the app is hidden
          setSaveState('error')
        }
      } catch {
        dirty.current = true
        setSaveState('error')
      } finally {
        inFlight.current = null
      }
    })()
    return inFlight.current
  }, [url, load])

  useEffect(() => {
    load()
  }, [load])

  // live updates: another device (or tab) saved this store -> load it, unless it's our own save or we have changes on the way
  const name = url.split('/').pop() // '/api/habit' -> 'habit'
  useEffect(() => {
    const onChange = (e) => {
      const { store, version: v } = e.detail ?? {}
      if (store !== name && store !== '*') return
      if (version.current === null || (v && v === version.current)) return // not loaded yet / we already have it
      if (dirty.current || inFlight.current) return // ours is being saved; if it's out of date the server says so (409)
      load()
    }
    window.addEventListener(DATA_CHANGE, onChange)
    return () => window.removeEventListener(DATA_CHANGE, onChange)
  }, [name, load])

  // save shortly after each change (debounced so typing a note isn't a request per key)
  useEffect(() => {
    if (!dirty.current || data === null) return
    latest.current = data
    setSaveState('saving')
    clearTimeout(timer.current)
    timer.current = setTimeout(flush, delay)
  }, [data, delay, flush])

  // leaving the app (switching apps, locking the phone, closing the tab): send pending changes now
  useEffect(() => {
    const away = () => document.visibilityState === 'hidden' && flush()
    document.addEventListener('visibilitychange', away)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', away)
      window.removeEventListener('pagehide', flush)
    }
  }, [flush])

  const update = useCallback((fn) => {
    dirty.current = true
    setData(fn)
  }, [])

  return { data, status, saveState, update, flush }
}
