const NIQQUD_RE = /[֑-ׇ]/g

// Matches the word תפיסה, optionally attached to up to two one-letter
// Hebrew prefixes (ב/ה/ו/כ/ל/מ/ש, e.g. "בתפיסה", "ולתפיסה").
const TFISA_RE = /([בהוכלמש]{0,2})תפיסה(?![א-ת])/g

function normalize(str) {
  return str
    .replace(NIQQUD_RE, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function sentencesMatch(input, expected) {
  const normInput = normalize(input)
  const normExpected = normalize(expected)
  if (normInput === normExpected) return true

  // "תפיסה" is accepted interchangeably with "גישה" (same prefix carried
  // over) - the rest of the sentence still has to match exactly.
  const altExpected = normExpected.replace(TFISA_RE, (_m, prefix) => `${prefix}גישה`)
  return altExpected !== normExpected && normInput === altExpected
}

export function wordsMatch(input, expected) {
  return normalize(input).toLowerCase() === normalize(expected).toLowerCase()
}

export function shuffle(list) {
  const arr = [...list]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}
