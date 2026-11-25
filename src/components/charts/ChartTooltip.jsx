import './ChartTooltip.css'

// hover / tap readout for a chart; fixed-position so a scrolling pane can't clip it. Content comes from the chart.
export default function ChartTooltip({ x, y, children }) {
  return (
    <div className="tip" role="status" style={{ left: Math.min(Math.max(x, 90), window.innerWidth - 90), top: y - 6 }}>
      {children}
    </div>
  )
}
