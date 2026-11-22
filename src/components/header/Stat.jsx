import './Stat.css'

// one headline number: a big value over a small label (details in the hover tooltip)
export default function Stat({ name, value, of, tip }) {
  return (
    <div className="stat" title={tip}>
      <strong>
        {value}
        {of !== undefined && <span className="stat-of"> / {of}</span>}
      </strong>
      <span>{name}</span>
    </div>
  )
}
