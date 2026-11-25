import { useCallback, useRef, useState } from 'react'
import { useDismiss } from './useDismiss.js'

// the readout under the pointer for a chart: mouse hover, or a finger tapping / dragging across the plot.
// pick(event, plotRect) -> { i, x, y } (what is under the pointer, and where on screen to anchor the readout) or null.
// Touch has no "leave", so the readout stays after the finger lifts; a tap elsewhere (or Escape) dismisses it.
export function useChartHover(pick) {
  const plotRef = useRef(null)
  const [hover, setHover] = useState(null)
  const close = useCallback(() => setHover(null), [])
  useDismiss(hover !== null, plotRef, close)
  const show = (e) => setHover(pick(e, plotRef.current.getBoundingClientRect()))
  const handlers = { onPointerDown: show, onPointerMove: show, onPointerLeave: (e) => e.pointerType !== 'touch' && close() }
  return { plotRef, hover, handlers }
}
