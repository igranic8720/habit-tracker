// the At a glance year tracker's one-line nudge: the most damning true thing about your tracked time, worst first.
// perDay: Map<'YYYY-MM-DD', ms> of days with time (this year); today: 'YYYY-MM-DD'; now: Date (for the time of day);
// since: the day tracking started (trackingStart): nothing before it counts against you. Returns { tone: 'bad' | 'ok', text }.
import { nextDay } from './time.js'

// the day tracking started: the earliest day anything was recorded (tracked time, a checklist tick, a workout set), or null when
// nothing has been. Worked out every time, never stored: adding forgotten time from before it moves it back.
export function trackingStart(...lists) {
  let first = null
  for (const list of lists) for (const k of list) if (!first || k < first) first = k
  return first
}
const shortDate = (key) => new Date(`${key}T12:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

const clockOf = (d) => d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

// the runs of days in a row with time: the current one (today counts once it has time) and the year's longest
export function runs(perDay, today, first) {
  let streak = 0
  let k = perDay.has(today) ? today : nextDay(today, -1)
  while (k >= first && perDay.has(k)) { streak++; k = nextDay(k, -1) }
  let best = 0
  let run = 0
  for (let d = first; d <= today; d = nextDay(d)) {
    run = perDay.has(d) ? run + 1 : 0
    best = Math.max(best, run)
  }
  return { streak, best }
}

export function shameLine(perDay, today, now = new Date(), since = null) {
  const year = today.slice(0, 4)
  if (!since) return { tone: 'ok', text: 'Nothing tracked yet. The clock starts the day you do something.' }
  const first = since > `${year}-01-01` ? since : `${year}-01-01` // counting starts at the later of Jan 1 and your first day
  const { streak, best } = runs(perDay, today, first)
  const yesterday = nextDay(today, -1)
  const yesterdayMissed = yesterday >= first && !perDay.has(yesterday)
  const todayEmpty = !perDay.has(today)

  // gone quiet: days since anything was tracked
  if (!perDay.size) return { tone: 'bad', text: `Nothing tracked in ${year}. Not one minute.` }
  if (todayEmpty && yesterdayMissed) {
    const last = [...perDay.keys()].filter((k) => k < today).sort().at(-1)
    let gap = 0
    for (let k = last; k < today; k = nextDay(k)) gap++
    return { tone: 'bad', text: `${plural(gap, 'day')} since you last tracked anything.` }
  }
  // today is slipping away
  if (todayEmpty && now.getHours() >= 12) {
    return { tone: 'bad', text: `It’s ${clockOf(now)} and today is still empty.${streak >= 3 ? ` Your ${streak}-day run ends at midnight.` : ''}` }
  }
  if (yesterdayMissed) return { tone: 'bad', text: 'Yesterday was a blank. Don’t make it two.' }
  // a run that falls short of the year's best
  if (best >= 3 && streak < best) return { tone: 'bad', text: `Your best run this year was ${best} days. You’re on ${streak}.` }
  // the last week, the year so far
  let missedWeek = 0
  for (let i = 1; i <= 7; i++) { const k = nextDay(today, -i); if (k >= first && !perDay.has(k)) missedWeek++ }
  if (missedWeek >= 2) return { tone: 'bad', text: `${missedWeek} of the last 7 days: nothing.` }
  let past = 0
  for (let k = first; k < today; k = nextDay(k)) past++
  const wasted = past ? Math.round(((past - [...perDay.keys()].filter((k) => k < today).length) / past) * 100) : 0
  const span = first === `${year}-01-01` ? `${year} so far` : `the days since ${shortDate(first)}`
  if (wasted >= 25) return { tone: 'bad', text: `${wasted}% of ${span} has nothing to show for it.` }
  // doing well: still no praise, just pressure
  return { tone: 'ok', text: streak >= best && streak >= 3 ? `${streak} days straight, your best this year. Don’t be the one who breaks it.` : `${plural(streak, 'day')} straight. Keep it that way.` }
}
