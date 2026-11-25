import './Swatch.css'

// the habit's colour dot: a button that changes the colour when given onClick, otherwise a static marker
export default function Swatch({ onClick }) {
  if (!onClick) return <span className="swatch static" />
  return <button type="button" className="swatch" title="Change colour" aria-label="Change colour" onClick={onClick} /> // type=button: never submits a form it sits in
}
