import { useCallback, useRef, useState } from 'react'
import { useDismiss } from '../../hooks/useDismiss.js'
import { COLORS } from '../../lib/habits.js'
import './ColorPicker.css'

// the colour dot of a habit or plan: tap it to open a grid of the 28 colours, tap one to choose. Escape or a tap elsewhere closes it.
// The dot shows the colour of the nearest data-color around it.
// taken: Map<colour, who uses it> of colours that can't be chosen here (a habit can't take a plan's colour, and vice versa)
export default function ColorPicker({ value, onChange, taken }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(open, ref, close)

  return (
    <span className="cp" ref={ref}>
      <button type="button" className="swatch" title="Change colour" aria-label={`Colour: ${value}. Change`} aria-haspopup="true" aria-expanded={open} onClick={() => setOpen(!open)} />
      {open && (
        <span className="cp-pop" role="group" aria-label="Choose a colour">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className="cp-opt"
              data-color={c}
              title={taken?.has(c) ? `${c}: ${taken.get(c)}` : c === 'white' ? 'white (shown dark in light mode)' : c}
              aria-label={taken?.has(c) ? `${c}, ${taken.get(c)}` : c}
              aria-pressed={c === value}
              disabled={taken?.has(c) && c !== value}
              onClick={() => {
                onChange(c)
                setOpen(false)
              }}
            />
          ))}
        </span>
      )}
    </span>
  )
}
