import './Panel.css'

// a titled card used for the dashboard panels
export default function Panel({ title, label, children }) {
  return (
    <section className="panel surface" aria-label={label ?? (typeof title === 'string' ? title : undefined)}>
      <h2 className="panel-title">{title}</h2>
      {children}
    </section>
  )
}
