import { useState } from 'react'
import './NumField.css'

// a number box that keeps what you type ("82." stays "82." while you reach for the 5) but reports a clean number.
// Plain text input + inputMode gives the phone's number pad without the browser's spinner and rounding quirks.
export default function NumField({ value, onChange, max, decimal = false, label, placeholder = '0' }) {
  const [text, setText] = useState(value ? String(value) : '')
  const matches = text === '' ? value === 0 : Number(text.replace(',', '.')) === value
  const shown = matches ? text : value ? String(value) : ''
  const parse = (t) => {
    const n = decimal ? parseFloat(t.replace(',', '.')) : parseInt(t, 10)
    return Number.isFinite(n) && n > 0 ? Math.min(n, max) : 0
  }
  return (
    <input
      className="num"
      type="text"
      inputMode={decimal ? 'decimal' : 'numeric'}
      autoComplete="off"
      aria-label={label}
      placeholder={placeholder}
      value={shown}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        const t = e.target.value
        if (!(decimal ? /^\d{0,5}[.,]?\d{0,2}$/ : /^\d{0,4}$/).test(t)) return
        setText(t)
        onChange(parse(t))
      }}
    />
  )
}
