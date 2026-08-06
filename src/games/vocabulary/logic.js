export function shuffle(list) {
  const arr = [...list]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function generateRound(words) {
  return shuffle(words)
}

// A gentle shuffle that keeps the overall worst-to-best order but lets
// nearby words trade places, so the ranking isn't followed rigidly. Splits
// the list into small fixed chunks and shuffles within each one, so a word
// never drifts more than chunkSize-1 spots from where it started.
export function nearbyShuffle(list, chunkSize = 3) {
  const result = []
  for (let i = 0; i < list.length; i += chunkSize) {
    result.push(...shuffle(list.slice(i, i + chunkSize)))
  }
  return result
}

// Anything that isn't a Hebrew letter (niqqud, punctuation, stray latin/digits,
// an accidental slash or comma from a slipped key) is just noise — drop it
// rather than let it fail an otherwise-correct answer.
const NON_HEBREW_RE = /[^א-ת ]/g
const CLAUSE_SPLIT_RE = /,|\bאו\b|[():/]/

// Generic/filler words that shouldn't count toward a definition's required keywords.
const STOPWORDS = new Set([
  'של', 'את', 'גם', 'או', 'על', 'עם', 'אל', 'כמו', 'זה', 'זו', 'זהו', 'זוהי',
  'הוא', 'היא', 'הם', 'הן', 'אני', 'אתה', 'אנחנו', 'יש', 'אין', 'לא', 'כן',
  'מה', 'מי', 'איך', 'למה', 'כי', 'אבל', 'רק', 'כל', 'כך', 'כאן', 'שם', 'אז',
  'עוד', 'וגם', 'אחד', 'אחת', 'דבר', 'דברים', 'משהו', 'כלשהו', 'מעין', 'סוג',
  'הרבה', 'מאוד', 'לפעמים', 'בדרך', 'כלל', 'באופן', 'צורה', 'לו', 'לה', 'להם',
])

const MATCH_THRESHOLD = 0.5

// Below this length a single-letter edit changes too much of the word to
// treat as a typo — require an exact match instead.
const MIN_FUZZY_LENGTH = 3

// How many letters can be missing or extra (e.g. Hebrew's ktiv male/haser
// vav/yud variations) and still count as the same word.
const MAX_LENGTH_DIFF = 2

function normalize(str) {
  return str.replace(NON_HEBREW_RE, ' ').replace(/\s+/g, ' ').trim()
}

function tokenize(str) {
  return normalize(str)
    .split(' ')
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
}

// Definitions often list alternate senses ("A, B (also: C, D)") separated by
// commas, "או" (or), or parentheses/colons. Matching any one clause well
// counts as knowing the word.
function splitClauses(def) {
  return def
    .split(CLAUSE_SPLIT_RE)
    .map((c) => c.trim())
    .filter(Boolean)
}

// True if a and b are equal, or differ by only a small typo: a wrong letter,
// two adjacent letters swapped, or up to MAX_LENGTH_DIFF letters missing/extra
// (covers Hebrew spelling variants like an extra or missing vav/yud too).
function isCloseMatch(a, b) {
  if (a === b) return true
  if (a.length < MIN_FUZZY_LENGTH || b.length < MIN_FUZZY_LENGTH) return false
  const lenDiff = Math.abs(a.length - b.length)
  if (lenDiff > MAX_LENGTH_DIFF) return false

  if (lenDiff === 0) {
    const diffPositions = []
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        diffPositions.push(i)
        if (diffPositions.length > 2) return false
      }
    }
    if (diffPositions.length === 1) return true // one wrong letter
    if (diffPositions.length === 2) {
      const [i, j] = diffPositions
      return j === i + 1 && a[i] === b[j] && a[j] === b[i] // adjacent swap
    }
    return false
  }

  // Lengths differ by 1-2 letters — accept if the shorter word is a
  // subsequence of the longer one, i.e. the only difference is missing/extra
  // letters (in any position, not just the end).
  const shorter = a.length < b.length ? a : b
  const longer = a.length < b.length ? b : a
  let i = 0
  for (let j = 0; j < longer.length && i < shorter.length; j++) {
    if (shorter[i] === longer[j]) i++
  }
  return i === shorter.length
}

const MEANING_SPLIT_RE = /\s*\+\s*/

// Some words carry genuinely distinct senses, marked with "+" between them
// in the dictionary — unlike the comma/"או" alternates checkAnswer already
// treats as restating the same sense, each "+"-separated part must be
// answered on its own before the word counts as known.
export function splitMeanings(def) {
  return def.split(MEANING_SPLIT_RE).map((m) => m.trim()).filter(Boolean)
}

export function checkAnswer(userAnswer, correctDef) {
  const userNorm = normalize(userAnswer)
  if (!userNorm) return false

  const defNorm = normalize(correctDef)
  if (userNorm === defNorm) return true
  if (userNorm.length > 2 && (defNorm.includes(userNorm) || userNorm.includes(defNorm))) return true
  if (isCloseMatch(userNorm, defNorm)) return true

  const userTokens = tokenize(userAnswer)
  if (userTokens.length === 0) return false

  const clauses = splitClauses(correctDef)
  const clauseList = clauses.length > 0 ? clauses : [correctDef]

  return clauseList.some((clause) => {
    const clauseTokens = tokenize(clause)
    if (clauseTokens.length === 0) return false
    const matched = clauseTokens.filter((t) => userTokens.some((u) => isCloseMatch(u, t))).length
    return matched / clauseTokens.length >= MATCH_THRESHOLD
  })
}
