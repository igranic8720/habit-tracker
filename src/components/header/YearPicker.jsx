import { YEAR } from '../../lib/dates.js'
import './YearPicker.css'

// ‹ 2026 ⌄ ›  — step through years with the arrows or jump with the dropdown
export default function YearPicker({ year, years, firstYear, onChange }) {
  return (
    <div className="year-picker" role="group" aria-label="Year">
      <button aria-label="Previous year" title="Previous year" disabled={year <= firstYear} onClick={() => onChange(year - 1)}>
        ‹
      </button>
      <select aria-label="Year" value={year} onChange={(e) => onChange(Number(e.target.value))}>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
      <button aria-label="Next year" title="Next year" disabled={year >= YEAR} onClick={() => onChange(year + 1)}>
        ›
      </button>
    </div>
  )
}
