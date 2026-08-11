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

  // SVG has no z-index - later siblings simply paint over earlier ones at
  // shared edges. With a fixed rectangles/triangles/square paint order, the
  // square (always painted last) would clip the highlighted stroke whenever
  // a rectangle or triangle is the highlighted piece. Painting the
  // highlighted piece last, whichever one it is, keeps its accent outline
  // fully on top instead of getting cut off by a neighboring piece's edge.
  const allPieces = [
    ...RECTANGLES.map((points, i) => ({ points, isHighlighted: highlight === 'rectangle' && i === 0, key: `rect-${i}` })),
    ...TRIANGLES.map((points, i) => ({ points, isHighlighted: highlight === 'triangle' && i === 0, key: `tri-${i}` })),
    { points: SQUARE, isHighlighted: highlight === 'square', key: 'square' },
  ]
  const orderedPieces = [...allPieces.filter((p) => !p.isHighlighted), ...allPieces.filter((p) => p.isHighlighted)]

  return (
    <svg viewBox={`0 0 ${viewSize} ${viewSize}`} width={size} height={size}>
      {orderedPieces.map(({ points, isHighlighted, key }) => piece(points, isHighlighted, key))}
    </svg>
  )
}
