// ↑ ↓ ✕ for a row in an editor list (exercises in a plan, days in a cycle)
export default function ReorderButtons({ index, count, onMove, onRemove, removeLabel }) {
  return (
    <span className="pe-move">
      <button type="button" aria-label="Move up" disabled={index === 0} onClick={() => onMove(-1)}>
        ↑
      </button>
      <button type="button" aria-label="Move down" disabled={index === count - 1} onClick={() => onMove(1)}>
        ↓
      </button>
      <button type="button" aria-label={removeLabel} onClick={onRemove}>
        ✕
      </button>
    </span>
  )
}
