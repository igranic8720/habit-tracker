import { useEffect } from 'react'

// while `open`: a tap / click outside `ref`, or Escape, calls onClose (menus, the colour grid, chart readouts)
export function useDismiss(open, ref, onClose) {
  useEffect(() => {
    if (!open) return
    const outside = (e) => {
      if (!ref.current?.contains(e.target)) onClose()
    }
    const escape = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', escape)
    }
  }, [open, ref, onClose])
}
