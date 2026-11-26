import { useRef, useState } from 'react'
import { YEAR, todayKey } from '../../../lib/dates.js'
import { cycleStatus, newSession, planColor, resolveStep, restText } from '../../../lib/plans.js'
import { bestBefore, describe, exerciseNames, hasSets, lastTime } from '../../../lib/workouts.js'
import DayDetail from '../../calendar/DayDetail.jsx'
import Heatmap from '../../calendar/Heatmap.jsx'
import NotesLog from '../../calendar/NotesLog.jsx'
import TodayNote from '../../shared/TodayNote.jsx'
import ExerciseProgress from '../ExerciseProgress.jsx'
import { useNow } from '../../../hooks/useNow.js'
import RestTimer from './RestTimer.jsx'
import TimerButton from '../../time/TimerButton.jsx'
import WorkoutDay from '../WorkoutDay.jsx'
import WorkoutChooser from './WorkoutChooser.jsx'
import WorkoutLog from './WorkoutLog.jsx'
import './WorkoutDiary.css'
import { CaretDownOutlined, CaretRightOutlined } from '@ant-design/icons'

// the Today tab: choose today's workout (or carry on with it), tick off sets, then the year heatmap, progress and history
export default function WorkoutDiary({ w, diary, time, year }) {
  const [logOpen, setLogOpen] = useState(false)
  const [selected, setSelected] = useState(null) // a clicked past day, opened read-only (past days are locked)
  const todayRef = useRef(null)
  const [choosing, setChoosing] = useState(false) // the plan picker, reopened from a loaded workout

  const session = w.log[todayKey]
  const cycle = w.cycles.find((c) => c.id === w.active)
  const status = cycle ? cycleStatus(cycle, w.plans, w.log) : null
  const inYear = (k) => k.startsWith(`${year}-`)
  const total = diary.days.filter(inYear).length

  // the history lists every day with a ticked set or a note, newest first
  const keys = [...new Set([...diary.days, ...Object.keys(diary.notes)])].filter(inYear)
  const history = keys
    .filter((k) => !(year === YEAR && k === todayKey))
    .sort((a, b) => b.localeCompare(a))
    .map((k) => {
      const d = w.log[k]
      return [k, [d.name, ...describe(d.entries).map((l) => `${l.exercise}: ${l.text}`), d.note].filter(Boolean).join('\n')]
    })
  const sel = selected && inYear(selected) && selected <= todayKey ? selected : null

  // loading a plan for today (its sets pre-filled, weights from last time) or a blank freestyle workout. It replaces whatever
  // today had; only ticked sets are worth a question first. Today's note is kept.
  const load = (plan, step) => {
    if (session && hasSets(session.entries) && !confirm(`Replace today’s workout with ${plan ? `“${plan.name}”` : 'a freestyle workout'}? The sets you ticked are cleared; your note is kept.`)) return
    const next = newSession(plan, w, diary, todayKey, step)
    w.setDay(todayKey, { ...next, ...(session?.note ? { note: session.note } : {}), ...(session?.sessions ? { sessions: session.sessions } : {}) }) // note and tracked time are kept
    setChoosing(false)
  }
  const setEntries = (entries) => w.patchDay(todayKey, (d) => ({ ...d, entries }))
  const setNote = (text) =>
    w.patchDay(todayKey, (d) => {
      const { note: _old, ...others } = d
      return text.trim() ? { ...others, note: text } : others
    })
  const clear = () => {
    if ((hasSets(session.entries) || session.note || session.sessions) && !confirm('Clear today’s workout? The sets you ticked, today’s note and the time tracked for it are removed.')) return
    w.setDay(todayKey, null)
  }

  const pickDay = (key) => {
    if (key === todayKey) {
      setSelected(null)
      todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    } else setSelected(key === sel ? null : key)
  }
  const sc = session && w.cycles.find((c) => c.id === session.cycle)
  // each day takes its plan's colour (freestyle days and deleted plans stay blue)
  const planOf = (key) => w.plans.find((p) => p.id === w.log[key]?.plan)
  const colorOf = (key) => (w.log[key] ? planColor(planOf(key)) : undefined)
  // sets can only be logged once the workout is started (its timer is running, or it has already been timed / has sets from before)
  const timing = time?.running?.kind === 'workout'
  const started = !!session && (timing || (session.sessions?.length ?? 0) > 0 || hasSets(session.entries))
  const busy = time?.running && !timing ? time.running.label : null // another timer is running
  const what = session && { kind: 'workout', ref: null, label: session.name || 'Workout', color: planColor(planOf(todayKey)) }
  // the rest timer: started by ticking a set, as long as the plan says how long to rest. It is saved with today's workout, so every
  // device shows the same countdown. Once it has run out (plus a few seconds of "rest over") it is gone.
  const restLen = planOf(todayKey)?.rest
  const now = useNow(!!session?.rest, 2000)
  const resting = session?.rest && now < session.rest.end + 8000 ? session.rest : null
  const startRest = () => {
    const now = Date.now()
    if (restLen) w.patchDay(todayKey, (d) => ({ ...d, rest: { start: now, end: now + restLen * 1000 } }))
  }
  const stopRest = () =>
    w.patchDay(todayKey, (d) => {
      const { rest: _r, ...others } = d
      return others
    })
  const adjustRest = (seconds) =>
    w.patchDay(todayKey, (d) => (d.rest ? { ...d, rest: { ...d.rest, end: Math.min(d.rest.start + 3600000, Math.max(Date.now(), d.rest.end + seconds * 1000)) } } : d))
  // the key under the heatmap: an empty square, then one coloured square per plan (and grey for freestyle days, when there are any)
  const freestyle = diary.days.some((k) => inYear(k) && !planOf(k))
  const legend = (
    <ul className="legend plan-legend" aria-label="Legend">
      <li>
        <i className="lg" /> No workout
      </li>
      {w.plans.map((p) => (
        <li key={p.id} data-color={planColor(p)}>
          <i className="lg on" /> {p.name || 'Untitled plan'}
        </li>
      ))}
      {freestyle && (
        <li data-color="gray">
          <i className="lg on" /> Freestyle
        </li>
      )}
    </ul>
  )

  return (
    <section className="card surface habit-color diary" data-color="blue">
      <div className="title">
        <h2 className="diary-name">Training log</h2>
        <button className="notes-toggle" aria-expanded={logOpen} onClick={() => setLogOpen(!logOpen)}>
          {logOpen ? <CaretDownOutlined /> : <CaretRightOutlined />} History{keys.length > 0 ? ` (${keys.length})` : ''}
        </button>
      </div>

      {year === YEAR && (
        <div ref={todayRef} className="diary-today">
          {(!session || choosing) && (
            <WorkoutChooser w={w} cycle={cycle} status={status} session={session} onLoad={load} onCancel={session ? () => setChoosing(false) : undefined} />
          )}
          {session && resting && <RestTimer rest={resting} onAdjust={adjustRest} onStop={stopRest} />}
          {session && (
            <>
              <WorkoutLog
                color={planColor(planOf(todayKey))}
                title={session.name}
                tag={[sc ? `${sc.name} · day ${resolveStep(sc, session) + 1} of ${sc.steps.length}` : session.plan ? 'Plan' : 'Freestyle', restLen ? `${restText(restLen)} rest` : session.plan && planOf(todayKey) ? 'no rest time set (edit the plan)' : null].filter(Boolean).join(' · ')}
                action={
                  <>
                    {started && <TimerButton t={time} what={what} label="Start workout" />}
                    {!choosing && (
                      <button type="button" className="btn btn-sm" onClick={() => setChoosing(true)}>
                        Change plan
                      </button>
                    )}
                    <button type="button" className="btn btn-sm" onClick={clear}>
                      Clear
                    </button>
                  </>
                }
                entries={session.entries}
                names={exerciseNames(diary)}
                lastTime={(name) => lastTime(diary, name, todayKey)}
                bestBefore={(name) => bestBefore(diary, name, todayKey)}
                onChange={setEntries}
                onTicked={(left) => {
                  if (left > 0) return startRest()
                  // the last set: the workout is done, so its rest and its timer stop (the time is saved with today's workout)
                  if (session.rest) stopRest()
                  if (timing) time.stop()
                }}
                locked={!started}
                gate={
                  <div className="wl-gate">
                    <p>
                      {busy ? (
                        <>
                          Stop the <strong>{busy}</strong> timer first, then start your workout.
                        </>
                      ) : (
                        <>
                          <strong>Start your workout</strong> to log weights and tick off sets. Its time is tracked until you stop it.
                        </>
                      )}
                    </p>
                    <TimerButton t={time} what={what} label="Start workout" />
                  </div>
                }
              />
              <TodayNote note={session.note ?? ''} onNote={setNote} />
            </>
          )}
        </div>
      )}

      <h3 className="summary">
        <strong>{total}</strong> {total === 1 ? 'workout' : 'workouts'} logged in {year}
      </h3>

      <Heatmap habit={diary} year={year} selected={sel} onPick={pickDay} colorOf={colorOf} legend={legend} />

      <ExerciseProgress habit={diary} />

      {sel && (
        <DayDetail dateKey={sel} done={diary.days.includes(sel)} note={diary.notes[sel]} name={w.log[sel]?.name} onClose={() => setSelected(null)}>
          {hasSets(diary.workouts[sel]) ? <WorkoutDay entries={diary.workouts[sel]} /> : null}
        </DayDetail>
      )}

      {logOpen && <NotesLog entries={history} onPick={setSelected} />}
    </section>
  )
}
