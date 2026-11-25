import { useCallback, useRef, useState } from 'react'
import { useDismiss } from '../../hooks/useDismiss.js'
import './HabitMenu.css'

// the ⋯ options menu; archiving takes two deliberate clicks (open the menu, then choose it)
export default function HabitMenu({ onArchive }) {
  const ref = useRef(null)
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])

  useDismiss(open, ref, close) // an outside tap or Escape closes it

  return (
    <div className="menu-wrap" ref={ref}>
      <button className="kebab" aria-label="Habit options" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        ⋯
      </button>
      {open && (
        <div className="menu" role="menu">
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onArchive()
            }}
          >
            Archive habit
          </button>
        </div>
      )}
    </div>
  )
}
