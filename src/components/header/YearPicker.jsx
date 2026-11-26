import './YearPicker.css'
import { LeftOutlined, RightOutlined } from '@ant-design/icons'

// ‹ 2026 ⌄ ›  — step through the years that have data with the arrows, or jump with the dropdown. years: newest first.
export default function YearPicker({ year, years, onChange }) {
  const i = years.indexOf(year)
  const older = years[i + 1]
  const newer = i > 0 ? years[i - 1] : undefined
  return (
    <div className="year-picker" role="group" aria-label="Year">
      <button aria-label="Previous year" title="Previous year" disabled={older === undefined} onClick={() => onChange(older)}>
        <LeftOutlined />
      </button>
      <select aria-label="Year" value={year} onChange={(e) => onChange(Number(e.target.value))}>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
      <button aria-label="Next year" title="Next year" disabled={newer === undefined} onClick={() => onChange(newer)}>
        <RightOutlined />
      </button>
    </div>
  )
}
