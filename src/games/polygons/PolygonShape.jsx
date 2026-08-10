// Renders a regular polygon outline (pentagon/hexagon/octagon/...) as an
// inline SVG, vertex-up, sized to fit a `size`×`size` box.
export default function PolygonShape({ sides, size = 120 }) {
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 8
  const points = Array.from({ length: sides }, (_, i) => {
    const angle = (Math.PI * 2 * i) / sides - Math.PI / 2
    const x = cx + r * Math.cos(angle)
    const y = cy + r * Math.sin(angle)
    return `${x.toFixed(2)},${y.toFixed(2)}`
  }).join(' ')

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinejoin="round"
    >
      <polygon points={points} />
    </svg>
  )
}
