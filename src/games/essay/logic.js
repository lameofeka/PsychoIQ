const NIQQUD_RE = /[֑-ׇ]/g

function normalize(str) {
  return str
    .replace(NIQQUD_RE, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function sentencesMatch(input, expected) {
  return normalize(input) === normalize(expected)
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
