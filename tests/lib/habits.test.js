// habit helpers: the colour palette, recolouring older data, browsable years, new habits
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { YEAR } from '../../src/lib/dates.js'
import { COLORS, browsableYears, firstFree, habitColor, habitName, newHabit, newId, recolor } from '../../src/lib/habits.js'

test('14 colours, the rainbow minus green plus white first, no duplicates', () => {
  assert.equal(COLORS.length, 14)
  assert.equal(new Set(COLORS).size, 14)
  assert.deepEqual(COLORS.slice(0, 6), ['red', 'orange', 'yellow', 'blue', 'violet', 'white'])
  assert.ok(!COLORS.includes('green'))
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

test('older colour names map to their nearest colour; green or none gets a free one; valid ones are untouched', () => {
  const old = ['purple', 'indigo', 'rose', 'coral', 'gold', 'aqua', 'blue', 'green', undefined].map((color, i) => ({ id: String(i), color }))
  assert.deepEqual(recolor(old).map((h) => h.color), ['violet', 'navy', 'wine', 'peach', 'yellow', 'blue', 'blue', 'red', 'orange'])
  const ok = [{ id: 'a', color: 'magenta' }]
  assert.equal(recolor(ok)[0], ok[0]) // same object: nothing to save
})

test('habit display helpers', () => {
  assert.equal(habitName({ name: '' }), 'Unnamed habit')
  assert.equal(habitName({ name: 'Read' }), 'Read')
  assert.equal(habitColor({ color: 'green' }), 'blue')
  assert.equal(habitColor({ color: 'wine' }), 'wine')
})

test('new habits get safe, unique ids (they become file names on the server)', () => {
  const ids = new Set(Array.from({ length: 200 }, newId))
  assert.equal(ids.size, 200)
  assert.ok([...ids].every((id) => /^[A-Za-z0-9_-]{1,64}$/.test(id)))
  const h = newHabit('cyan')
  assert.deepEqual({ ...h, id: 'x' }, { id: 'x', name: '', color: 'cyan', days: [], notes: {} })
  assert.equal(newHabit().color, 'red')
})

test('browsable years reach back to the earliest year with data, always at least last year', () => {
  assert.deepEqual(browsableYears([{ days: [], notes: {} }]).years, [YEAR, YEAR - 1])
  const r = browsableYears([{ days: [`${YEAR - 3}-05-01`], notes: { [`${YEAR - 4}-01-01`]: 'x' } }])
  assert.equal(r.firstYear, YEAR - 4)
  assert.deepEqual(r.years, [YEAR, YEAR - 1, YEAR - 2, YEAR - 3, YEAR - 4])
})
