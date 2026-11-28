import { useCallback, useEffect, useMemo, useState } from 'react'
import HeaderStats from './components/header/HeaderStats.jsx'
import PageHeader from './components/header/PageHeader.jsx'
import GlanceStats from './components/header/GlanceStats.jsx'
import Pomodoro from './components/header/Pomodoro.jsx'
import WorkoutStats from './components/header/WorkoutStats.jsx'
import Panel from './components/shared/Panel.jsx'
import { useDayRollover } from './hooks/useDayRollover.js'
import { useChecklist } from './hooks/useChecklist.js'
import { useHabits } from './hooks/useHabits.js'
import { useLiveUpdates } from './hooks/useLiveUpdates.js'
import { useNow } from './hooks/useNow.js'
import { useRoute } from './hooks/useRoute.js'
import { useTime } from './hooks/useTime.js'
import { useWorkouts } from './hooks/useWorkouts.js'
import { YEAR, todayKey } from './lib/dates.js'
import { browsableYears } from './lib/habits.js'
import { claimColors, habitName, newId, toggleCheck } from './lib/habits.js'
import { byDay, collect, dayKeyOf, habitDoneDays, total } from './lib/time.js'
import { trackingStart } from './lib/shame.js'
import { diaryOf, setCount } from './lib/workouts.js'
import HabitsPage from './pages/HabitsPage.jsx'
import GlancePage from './pages/GlancePage.jsx'
import WorkoutsPage from './pages/WorkoutsPage.jsx'

const RANK = { error: 4, conflict: 3, saving: 2, saved: 1, idle: 0 }

// three data sets (habits; workouts with their plans and cycles; tracked time) on three pages: At a glance (the home page), Habits, Workouts, switched from the header / tab bar
export default function App() {
  const hb = useHabits()
  const { habits: stored, recordSession, removeSession: removeHabitSession } = hb
  const cl = useChecklist() // checklist habits: a store of their own
  const checklist = cl.items
  // the two habit stores, for the parts of the app that handle both: loaded once both are; routed to whichever holds an id
  const status = hb.status === 'failed' || cl.status === 'failed' ? 'failed' : hb.status === 'ready' && cl.status === 'ready' ? 'ready' : 'loading'
  const { flush: flushHabits } = hb
  const { flush: flushChecklist } = cl
  const flush = useCallback(() => Promise.all([flushHabits(), flushChecklist()]), [flushHabits, flushChecklist])
  const storeOf = (id) => (checklist.some((c) => c.id === id) ? cl : hb)
  const own = ({ days: _view, kind: _kind, ...h }) => h // what is saved (done days and the checklist mark are worked out)
  const change = (id, next) => storeOf(id).change(id, own(next))
  const patch = (id, changes) => storeOf(id).patch(id, changes)
  const remove = (id) => storeOf(id).remove(id)
  const w = useWorkouts()
  const t = useTime()
  useLiveUpdates() // what another device saves shows up here straight away
  const { page, sub } = useRoute()
  const [year, setYear] = useState(YEAR)
  const diary = useMemo(() => diaryOf(w.log), [w.log])
  const { flush: flushWorkouts } = w
  const { flush: flushTime } = t
  // sessions split by day; with a timer running, refreshed every 30 s so the totals keep up
  const now = useNow(!!t.running, 30000)
  // every session, wherever it is kept: with its habit, with its workout day, or loose in the time store
  const sessions = useMemo(() => collect(stored, w.log, w.plans, t.sessions), [stored, w.log, w.plans, t.sessions])
  const timeByDay = useMemo(() => byDay(sessions, t.running, now), [sessions, t.running, now])
  // every habit with the days it is done: a timed one's days at its daily target (live while it is being timed), then the
  // checklist ones (marked kind: 'check') with their ticked days
  const habits = useMemo(
    () => [
      ...stored.map((h) => ({ ...h, days: habitDoneDays(h, t.running, now) })),
      ...checklist.map((c) => {
        const h = { ...c, kind: 'check' }
        return { ...h, days: habitDoneDays(h) }
      }),
    ],
    [stored, checklist, t.running, now],
  )

  // file a finished session with the timed habit or the workout it belongs to; anything else stays in the time store (checklist
  // habits are never timed: time for one, say from before the split, stays loose rather than being lost)
  const place = (s) => {
    const piece = { id: s.id ?? newId(), start: s.start, end: s.end }
    if (s.kind === 'habit' && stored.some((h) => h.id === s.ref)) recordSession(s.ref, piece)
    else if (s.kind === 'workout' && w.log[dayKeyOf(s.start)]) w.addSession(dayKeyOf(s.start), piece)
    else t.add({ ...s, ...piece })
  }
  const time = {
    ...t,
    stop: () => {
      const s = t.finish()
      if (s) place(s)
      return s
    },
    add: (s) => place(s),
    remove: (s) => {
      if (s.src.type === 'habit') removeHabitSession(s.src.id, s.id)
      else if (s.src.type === 'workout') w.removeSession(s.src.day, s.id)
      else t.remove(s.id)
    },
  }

  // every habit and plan has its own colour: each picker has everyone else's colours crossed out (claims: colour -> who has it),
  // and duplicates (older data, another device) are given free colours
  // the day tracking started: the first day with tracked time, a checklist tick or a workout set (At a glance counts from it)
  const since = useMemo(
    () =>
      trackingStart(
        [...timeByDay].filter(([, segs]) => total(segs) > 0).map(([k]) => k),
        checklist.flatMap((c) => Object.keys(c.checks ?? {})),
        Object.keys(w.log).filter((k) => setCount(w.log[k].entries) > 0),
      ),
    [timeByDay, checklist, w.log],
  )
  const claims = useMemo(
    () => new Map([...habits.map((h) => [h.color, `used by the habit “${habitName(h)}”`]), ...w.plans.map((p) => [p.color, `used by the plan “${p.name || 'Untitled'}”`])]),
    [habits, w.plans],
  )
  const { savePlan } = w
  const bothReady = status === 'ready' && w.status === 'ready'
  const { patch: patchHabit } = hb
  const { patch: patchCheck } = cl
  useEffect(() => {
    if (!bothReady) return
    const all = [...stored, ...checklist]
    const fixed = claimColors(all, w.plans)
    fixed.habits.forEach((h, i) => h !== all[i] && (i < stored.length ? patchHabit : patchCheck)(h.id, { color: h.color }))
    fixed.plans.forEach((p, i) => p !== w.plans[i] && savePlan(p))
  }, [bothReady, stored, checklist, w.plans, savePlan, patchHabit, patchCheck])

  // time tracked before it was stored with its habit / workout moves there (once; the same id is never counted twice)
  const ready = status === 'ready' && w.status === 'ready' && t.status === 'ready'
  const { removeMany } = t
  const { addSession } = w
  useEffect(() => {
    if (!ready) return
    const moved = []
    for (const s of t.sessions) {
      const piece = { id: s.id, start: s.start, end: s.end }
      if (s.kind === 'habit' && stored.some((h) => h.id === s.ref)) recordSession(s.ref, piece)
      else if (s.kind === 'workout' && w.log[dayKeyOf(s.start)]) addSession(dayKeyOf(s.start), piece)
      else continue
      moved.push(s.id)
    }
    if (moved.length) removeMany(moved)
  }, [ready, t.sessions, stored, w.log, recordSession, addSession, removeMany])

  // past midnight with the app still open: save what is pending, then reload so "today" is today
  useDayRollover(
    useCallback(async () => {
      await Promise.all([flush(), flushWorkouts(), flushTime()])
      location.reload()
    }, [flush, flushWorkouts, flushTime]),
  )

  if (status === 'loading') return null
  if (status === 'failed') {
    return (
      <main>
        <Panel title="Couldn’t load your habits">
          <p>The server didn’t answer. Nothing is shown, so nothing can be saved over your data. Reload the page to try again.</p>
        </Panel>
      </main>
    )
  }

  // the header shows one save status for all the stores: the most urgent one
  const saveState = [cl.saveState, w.saveState, t.saveState].reduce((a, b) => (RANK[b] > RANK[a] ? b : a), hb.saveState)
  // years you can browse: the years with a habit day, note, workout or tracked time in them (and this year)
  const { years } = browsableYears([...habits, { days: diary.days, notes: diary.notes }, { days: [...timeByDay.keys()], notes: {} }])

  return (
    <main>
      <PageHeader page={page} year={year} years={years} onYear={setYear} saveState={saveState}>
        {page === 'workouts' ? (
          <WorkoutStats log={w.status === 'ready' ? diary : null} year={year} />
        ) : page === 'glance' ? (
          <>
            <Pomodoro />
            <GlanceStats map={timeByDay} habits={habits.filter((h) => !h.archived)} workout={w.log[todayKey]} />
          </>
        ) : (
          <HeaderStats habits={habits.filter((h) => !h.archived)} year={year} />
        )}
      </PageHeader>
      {page === 'workouts' ? (
        <WorkoutsPage w={w} diary={diary} time={time} year={year} sub={sub} taken={claims} since={since} />
      ) : page === 'glance' ? (
        <GlancePage
          sub={sub}
          firstDay={`${years.at(-1)}-01-01`}
          t={time}
          map={timeByDay}
          habits={habits.filter((h) => !h.archived)}
          w={w}
          onHabitNote={(h, text) => {
            // the same note as on the Habits page; an empty one is removed so the file stays tidy
            const { [todayKey]: _old, ...others } = h.notes ?? {}
            patch(h.id, { notes: text.trim() ? { ...others, [todayKey]: text } : others })
          }}
          since={since}
          onHabitCheck={(h) => cl.patch(h.id, toggleCheck(h, todayKey))}
        />
      ) : (
        <HabitsPage habits={habits} year={year} sub={sub} time={time} taken={claims} since={since} change={change} patch={patch} add={() => hb.add([...claims.keys()])} addCheck={() => cl.add([...claims.keys()])} remove={remove} />
      )}
    </main>
  )
}
