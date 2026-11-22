import { useEffect, useRef, useState } from 'react'
import './HabitMenu.css'

// the ⋯ options menu; archiving takes two deliberate clicks (open the menu, then choose it)
export default function HabitMenu({ onArchive }) {
  const ref = useRef(null)
  const [open, setOpen] = useState(false)

  // close on an outside click or Escape
  useEffect(() => {
    if (!open) return
    const outside = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false)
    }
    const escape = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

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
