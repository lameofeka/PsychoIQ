// A regular octagon built from its area decomposition: one central square,
// 4 rectangles, and 4 corner triangles (see the comment above
// OCTAGON_AREA_FORMULA in logic.js for why these particular pieces).
// `highlight` ('square' | 'rectangle' | 'triangle' | null) picks out one
// instance of that piece in the accent color; every other piece - including
// the other 3 copies of the same shape - stays in a neutral outline so it's
// unambiguous which single piece the question means.
const A = 40
const S = A / 2
const E = A / Math.SQRT2

const SQUARE = [
  [-S, -S],
  [S, -S],
  [S, S],
  [-S, S],
]

const RECTANGLE = [
  [S, -S],
  [S + E, -S],
  [S + E, S],
  [S, S],
]

const TRIANGLE = [
  [S, -S],
  [S + E, -S],
  [S, -S - E],
]

function rotate90([x, y]) {
  return [-y, x]
}

function rotatePoints(points, times) {
  let result = points
  for (let i = 0; i < times; i++) result = result.map(rotate90)
  return result
}

const RECTANGLES = [0, 1, 2, 3].map((i) => rotatePoints(RECTANGLE, i))
const TRIANGLES = [0, 1, 2, 3].map((i) => rotatePoints(TRIANGLE, i))

export default function OctagonAreaDiagram({ highlight, size = 150 }) {
  const margin = 8
  const offset = S + E + margin
  const viewSize = offset * 2

  function toAttr(points) {
    return points.map(([x, y]) => `${x + offset},${y + offset}`).join(' ')
  }

  function piece(points, isHighlighted, key) {
    return (
      <polygon
        key={key}
        points={toAttr(points)}
        fill={isHighlighted ? 'var(--accent-bg)' : 'none'}
        stroke={isHighlighted ? 'var(--accent)' : 'var(--border)'}
        strokeWidth={isHighlighted ? 2.5 : 1.5}
        strokeLinejoin="round"
      />
    )
  }

  return (
    <svg viewBox={`0 0 ${viewSize} ${viewSize}`} width={size} height={size}>
      {RECTANGLES.map((points, i) => piece(points, highlight === 'rectangle' && i === 0, `rect-${i}`))}
      {TRIANGLES.map((points, i) => piece(points, highlight === 'triangle' && i === 0, `tri-${i}`))}
      {piece(SQUARE, highlight === 'square', 'square')}
    </svg>
  )
}
