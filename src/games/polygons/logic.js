export const POLYGONS = [
  { sides: 5, name: 'מחומש' },
  { sides: 6, name: 'משושה' },
  { sides: 8, name: 'מתומן' },
]

function buildFact(polygon) {
  const sum = (polygon.sides - 2) * 180
  return {
    id: polygon.sides,
    sides: polygon.sides,
    name: polygon.name,
    sum,
    angle: sum / polygon.sides,
    central: 360 / polygon.sides,
  }
}

export const POLYGON_FACTS = POLYGONS.map(buildFact)

export function shuffle(list) {
  const arr = [...list]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function generateRound(settings) {
  const pool = settings?.weakFacts && settings.weakFacts.length > 0 ? settings.weakFacts : POLYGON_FACTS
  return shuffle(pool)
}

export function describeSettings(settings) {
  if (settings?.weakFacts && settings.weakFacts.length > 0) {
    return `תרגול חולשות (${settings.weakFacts.length} צורות)`
  }
  return `כל המצולעים (${POLYGON_FACTS.length})`
}
