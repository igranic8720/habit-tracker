// habit helpers: the colour palette, recolouring older data, browsable years, new habits
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { YEAR } from '../../src/lib/dates.js'
import { COLORS, browsableYears, firstFree, habitColor, habitName, newHabit, newId, recolor } from '../../src/lib/habits.js'

test('28 colours, the first 14 as before, then 14 more from green; no duplicates', () => {
  assert.equal(COLORS.length, 28)
  assert.equal(new Set(COLORS).size, 28)
  assert.deepEqual(COLORS.slice(0, 6), ['red', 'orange', 'yellow', 'blue', 'violet', 'white'])
  assert.equal(COLORS[14], 'green')
  // none of the retired names (they still turn into their nearest colour when old data is loaded)
  assert.ok(!['aqua', 'purple', 'indigo', 'rose', 'coral', 'gold'].some((c) => COLORS.includes(c)))
})

test('the colour list matches what the server accepts', async () => {
  const src = await import('node:fs').then((fs) => fs.readFileSync(new URL('../../server/workouts.js', import.meta.url), 'utf8'))
  const server = JSON.parse(src.match(/const COLORS = (\[[^\]]*\])/)[1].replaceAll("'", '"'))
  assert.deepEqual(server, COLORS)
})

test('a new habit or plan takes the first colour not in use', () => {
  assert.equal(firstFree([]), 'red')
  assert.equal(firstFree(['red', 'orange']), 'yellow')
  assert.equal(firstFree(COLORS), 'red') // all used: they repeat
})

test('older colour names map to their nearest colour; none gets a free one; valid ones (green too, now) are untouched', () => {
  const old = ['purple', 'indigo', 'rose', 'coral', 'gold', 'aqua', 'blue', 'green', undefined, 'nope'].map((color, i) => ({ id: String(i), color }))
  assert.deepEqual(recolor(old).map((h) => h.color), ['violet', 'navy', 'wine', 'peach', 'yellow', 'blue', 'blue', 'green', 'red', 'orange'])
  const ok = [{ id: 'a', color: 'magenta' }]
  assert.equal(recolor(ok)[0], ok[0]) // same object: nothing to save
})

test('habit display helpers', () => {
  assert.equal(habitName({ name: '' }), 'Unnamed habit')
  assert.equal(habitName({ name: 'Read' }), 'Read')
  assert.equal(habitColor({ color: 'green' }), 'green')
  assert.equal(habitColor({ color: 'nope' }), 'blue')
  assert.equal(habitColor({ color: 'wine' }), 'wine')
})

test('new habits get safe, unique ids (they become file names on the server)', () => {
  const ids = new Set(Array.from({ length: 200 }, newId))
  assert.equal(ids.size, 200)
  assert.ok([...ids].every((id) => /^[A-Za-z0-9_-]{1,64}$/.test(id)))
  const h = newHabit('cyan')
  assert.deepEqual({ ...h, id: 'x' }, { id: 'x', name: '', color: 'cyan', target: null, notes: {} }) // no target yet; done days are never stored
  assert.equal(newHabit().color, 'red')
})

test('browsable years reach back to the earliest year with data, always at least last year', () => {
  assert.deepEqual(browsableYears([{ days: [], notes: {} }]).years, [YEAR]) // nothing tracked: only this year
  const r = browsableYears([{ days: [`${YEAR - 3}-05-01`, `${YEAR}-01-02`], notes: { [`${YEAR - 4}-01-01`]: 'x' } }])
  assert.deepEqual(r.years, [YEAR, YEAR - 3, YEAR - 4]) // only years with something in them (no empty years in between)
  assert.deepEqual(browsableYears([{ days: [`${YEAR + 1}-01-01`], notes: {} }]).years, [YEAR]) // never a year ahead
})

test('no two items share a colour: the first claimant keeps it, the others get a free one', async () => {
  const { claimColors, freeColor, COLORS } = await import('../../src/lib/habits.js')
  const H = (id, color, name = id) => ({ id, name, color, notes: {} }) // as stored: no days (they are worked out)
  const habits = [H('a', 'red'), H('b', 'red'), H('c', 'blue')]
  const plans = [{ id: 'p', color: 'blue' }, { id: 'q', color: 'orange' }]
  const out = claimColors(habits, plans)
  assert.deepEqual(out.habits.map((h) => h.color), ['red', 'yellow', 'blue']) // b loses red to a
  assert.deepEqual(out.plans.map((p) => p.color), ['violet', 'orange']) // p loses blue to habit c
  assert.equal(out.habits[0], habits[0]) // untouched items are the same objects (nothing to save)
  // a blank starter habit gives way to a plan
  const starter = claimColors([H('s', 'red', '')], [{ id: 'p', color: 'red' }])
  assert.deepEqual([starter.habits[0].color, starter.plans[0].color], ['orange', 'red'])
  // all 14 taken: nothing free, so a 15th keeps its (shared) colour rather than shuffling forever
  const many = COLORS.map((c, i) => H(`h${i}`, c))
  const extra = claimColors([...many, H('x', 'red')], [])
  assert.equal(extra.habits.at(-1).color, 'red')
  assert.equal(freeColor(COLORS), null)
  assert.equal(freeColor(['red']), 'orange')
})

test('new plans skip habit colours', async () => {
  const { newPlan } = await import('../../src/lib/plans.js')
  assert.equal(newPlan([{ color: 'red' }], ['orange', 'yellow']).color, 'blue')
})

test('daily targets step by 15 minutes from 15m to 24h', async () => {
  const { stepTarget, targetText } = await import('../../src/lib/habits.js')
  assert.equal(stepTarget(null, 1), 15) // none yet: up starts at 15m
  assert.equal(stepTarget(null, -1), null)
  assert.equal(stepTarget(15, 1), 30)
  assert.equal(stepTarget(15, -1), 15) // never below 15m
  assert.equal(stepTarget(1440, 1), 1440) // never above 24h
  assert.equal(stepTarget(1425, 1), 1440)
  assert.equal(stepTarget(20, 1), 30) // an odd value snaps onto the steps
  assert.equal(stepTarget(20, -1), 15)
  assert.deepEqual([15, 60, 90, 1440].map(targetText), ['15m', '1h', '1h 30m', '24h'])
})

test('a checklist habit is ticked off and unticked one day at a time', async () => {
  const { isCheck, toggleCheck, newCheck } = await import('../../src/lib/habits.js')
  const h = { id: 'c', kind: 'check' }
  assert.ok(isCheck(h))
  assert.ok(!isCheck({ id: 't' }))
  const one = { ...h, ...toggleCheck(h, '2026-03-02', 1000) }
  const two = { ...one, ...toggleCheck(one, '2026-03-01', 2000) }
  assert.deepEqual(two.checks, { '2026-03-02': 1000, '2026-03-01': 2000 }) // each day ticked, with the moment it was clicked
  assert.deepEqual(toggleCheck(two, '2026-03-02', 3000), { checks: { '2026-03-01': 2000 } }) // unticked: gone, moment and all
  const { checkedTime } = await import('../../src/lib/habits.js')
  const t = new Date(2026, 2, 1, 8, 42).getTime()
  assert.equal(checkedTime({ checks: { '2026-03-01': t } }, '2026-03-01'), new Date(t).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }))
  assert.equal(checkedTime({ checks: {} }, '2026-03-01'), null)
  const fresh = newCheck('cyan')
  assert.deepEqual({ ...fresh, id: 'x' }, { id: 'x', name: '', color: 'cyan', checks: {}, notes: {} }) // no target, no kind
})
