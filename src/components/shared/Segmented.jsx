import './Segmented.css'

// a small either/or switch: options [{ id, label }]
export default function Segmented({ label, options, value, onChange }) {
  return (
    <span className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </span>
  )
}
