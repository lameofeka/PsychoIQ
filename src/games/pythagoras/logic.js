export const TRIPLES = [
  [3, 4, 5],
  [6, 8, 10],
  [9, 12, 15],
  [12, 16, 20],
  [5, 12, 13],
]

export function tripleId(triple) {
  return triple.join(':')
}

export function shuffle(list) {
  const arr = [...list]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// Normal mode: one random position is "given"; the other two positions -
// in ascending order, not whichever the user types first - are blanks.
function buildQuestion(triple) {
  const givenIndex = Math.floor(Math.random() * 3)
  const blankIndices = [0, 1, 2].filter((i) => i !== givenIndex)
  return { id: tripleId(triple), triple, givenIndex, blankIndices }
}

// Chain mode ("לפי הסדר"): nothing is given - all 3 positions are blank,
// and the 5 triples are walked in their own fixed order (not shuffled).
function buildChainQuestion(triple) {
  return { id: tripleId(triple), triple, givenIndex: null, blankIndices: [0, 1, 2] }
}

export function generateRound(settings) {
  const pool = settings?.weakTriples && settings.weakTriples.length > 0 ? settings.weakTriples : TRIPLES
  if (settings?.inOrder) return TRIPLES.map(buildChainQuestion)
  return shuffle(pool.map(buildQuestion))
}

export function describeSettings(settings) {
  if (settings?.weakTriples && settings.weakTriples.length > 0) {
    return `תרגול חולשות (${settings.weakTriples.length} שלשות)`
  }
  return `כל השלשות (${TRIPLES.length})`
}
