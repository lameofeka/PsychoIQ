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

const VALUE_TYPES = [
  { key: 'sum', label: 'סכום הזוויות' },
  { key: 'angle', label: 'זווית אחת' },
  { key: 'central', label: 'הזווית המרכזית' },
]
const VALUE_ORDER = Object.fromEntries(VALUE_TYPES.map((v, i) => [v.key, i]))

function buildQuestions(fact) {
  return VALUE_TYPES.map((vt) => ({
    id: `${fact.sides}-${vt.key}`,
    sides: fact.sides,
    name: fact.name,
    key: vt.key,
    label: vt.label,
    answer: fact[vt.key],
  }))
}

// Every (shape, value) pair is its own single-answer question - 3 shapes ×
// 3 values (sum of angles / one angle / central angle) = 9 questions,
// instead of one 3-field question per shape.
export const POLYGON_QUESTIONS = POLYGON_FACTS.flatMap(buildQuestions)

export function shuffle(list) {
  const arr = [...list]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function sortInOrder(pool) {
  return [...pool].sort((a, b) => a.sides - b.sides || VALUE_ORDER[a.key] - VALUE_ORDER[b.key])
}

export function generateRound(settings) {
  let pool = POLYGON_QUESTIONS
  if (settings?.weakFacts && settings.weakFacts.length > 0) {
    const items = settings.weakFacts
    // "תרגול רק טעויות" passes back the exact wrong questions (they already
    // have `.key`); the progress map's "תרגול חולשות" passes whole weak
    // shapes instead, which expand to that shape's full set of 3 questions.
    pool = items.every((item) => item.key)
      ? items
      : POLYGON_QUESTIONS.filter((q) => items.some((f) => f.sides === q.sides))
  }
  // Chain mode ("לפי הסדר") walks ascending side count (5, 6, 8), then
  // sum/one angle/central within each shape, instead of shuffled order.
  return settings?.inOrder ? sortInOrder(pool) : shuffle(pool)
}

export function describeSettings(settings) {
  if (settings?.octagonArea) {
    return 'תרגול שטח מתומן'
  }
  if (settings?.weakFacts && settings.weakFacts.length > 0) {
    const isQuestionLevel = settings.weakFacts.every((item) => item.key)
    return isQuestionLevel
      ? `תרגול חולשות (${settings.weakFacts.length} שאלות)`
      : `תרגול חולשות (${settings.weakFacts.length} צורות)`
  }
  return `כל המצולעים (${POLYGON_QUESTIONS.length} שאלות)`
}

// --- Octagon area: formula + area-decomposition drill ---
//
// A regular octagon of side a decomposes into one central a×a square, 4
// rectangles (a × a/√2 each), and 4 right-isosceles corner triangles (legs
// a/√2 each, hypotenuse a - the octagon's own diagonal edges). Summing
// their areas (a² + 4·(a²/√2) + 4·(a²/4) = a² + 2√2a² + a²) gives the
// closed-form area 2a² + 2√2a², which is what the formula question asks
// the user to state in words.

export const OCTAGON_AREA_FORMULA = {
  id: 'formula',
  kind: 'formula',
  prompt: 'מהי נוסחת השטח של מתומן משוכלל (לפי אורך צלע a)?',
  answers: [
    'שתיים a בריבוע פלוס שתיים a בריבוע שורש שתיים',
    'שתיים a בריבוע ועוד שתיים a בריבוע שורש שתיים',
    'שתיים a בריבוע ועוד שתיים a בריבוע כפול שורש שתיים',
  ],
  // Shown back in the wrong-answer feedback as normal mathematical notation,
  // instead of echoing the spelled-out-in-words accepted answer.
  display: '2a² + 2a²√2',
}

export const OCTAGON_AREA_PARTS = [
  {
    id: 'part-square',
    kind: 'part',
    key: 'square',
    prompt: 'מהו שטח הריבוע המרכזי?',
    answers: ['x בריבוע'],
    display: 'x²',
  },
  {
    id: 'part-rectangle',
    kind: 'part',
    key: 'rectangle',
    prompt: 'מהו שטח מלבן אחד?',
    answers: ['x בריבוע חלקי שורש שתיים', 'שורש שתיים חלקי שתיים כפול x בריבוע'],
    display: 'x²/√2',
  },
  {
    id: 'part-triangle',
    kind: 'part',
    key: 'triangle',
    prompt: 'מהו שטח משולש אחד?',
    answers: ['x בריבוע חלקי ארבע'],
    display: 'x²/4',
  },
]

export function generateOctagonAreaRound(settings) {
  if (settings?.retryQuestions && settings.retryQuestions.length > 0) {
    return shuffle(settings.retryQuestions)
  }
  return [OCTAGON_AREA_FORMULA, ...shuffle(OCTAGON_AREA_PARTS)]
}

// Anything that isn't a Hebrew letter, a latin letter/digit (the formula's
// "a"/"x" variable), or a space is just stray punctuation - drop it rather
// than let it fail an otherwise-correct answer. Latin letters are compared
// case-insensitively; Hebrew has no case to normalize.
const FORMULA_STRIP_RE = /[^\wא-ת ]/g

// Typing the letter itself ("a"/"x") isn't the only natural way to answer -
// spelling its Hebrew name out loud ("איי"/"איקס") is just as valid, and
// likewise the spelled-out numbers ("שתיים"/"ארבע", including "שתיים" as
// part of "שורש שתיים") can be typed as plain digits ("2"/"4") instead. All
// of these fold onto the same canonical token before comparing. Word-
// boundary regex (\b) doesn't recognize Hebrew letters as word characters in
// JS, so this splits on whitespace and maps whole tokens instead.
const TOKEN_ALIASES = { איי: 'a', איקס: 'x', שתיים: '2', ארבע: '4' }

function normalizeFormula(str) {
  return str
    .replace(FORMULA_STRIP_RE, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .split(' ')
    .map((word) => TOKEN_ALIASES[word] ?? word)
    .join(' ')
}

export function checkFormulaAnswer(userAnswer, acceptedAnswers) {
  const userNorm = normalizeFormula(userAnswer)
  if (!userNorm) return false
  return acceptedAnswers.some((answer) => normalizeFormula(answer) === userNorm)
}
