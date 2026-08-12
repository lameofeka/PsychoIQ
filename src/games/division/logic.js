// The teaching table shown on the setup screen / progress map. `rule` and
// `example` are purely descriptive text for the learner - grading always
// uses real modulo arithmetic (see actualDivisors), never these strings.
export const DIVISOR_RULES = [
  { n: 2, rule: 'ספרת האחדות זוגית', example: '376' },
  { n: 3, rule: 'סכום הספרות מתחלק ב-3', example: '417' },
  { n: 4, rule: 'מספר 2 הספרות הימניות מתחלק ב-4', example: '6524' },
  { n: 5, rule: 'ספרת האחדות 0 או 5', example: '330, 2745' },
  { n: 6, rule: 'המספר מתחלק גם ב-2 וגם ב-3', example: '162' },
  { n: 8, rule: 'מספר 3 הספרות הימניות מתחלק ב-8', example: '320' },
  { n: 9, rule: 'סכום הספרות מתחלק ב-9', example: '3765' },
  { n: 10, rule: 'ספרת האחדות 0', example: '230' },
  { n: 11, rule: 'סכום מתחלף של הספרות (מהימין) שווה 0 או מתחלק ב-11', example: '132 → 2−3+1=0' },
]

export const DIVISORS = DIVISOR_RULES.map((rule) => rule.n)

export const MIN_NUMBER = 100
export const MAX_NUMBER = 9999
export const ROUND_SIZE = 12

export function shuffle(list) {
  const arr = [...list]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function randomNumber() {
  return MIN_NUMBER + Math.floor(Math.random() * (MAX_NUMBER - MIN_NUMBER + 1))
}

export function actualDivisors(value) {
  return DIVISORS.filter((n) => value % n === 0)
}

function buildQuestion(value) {
  return {
    id: `${value}-${Math.random().toString(36).slice(2)}`,
    value,
    divisors: actualDivisors(value),
  }
}

// "תרגול רק טעויות" on Results passes the exact numbers that were wrong
// (settings.retryValues) instead of a fresh random batch; otherwise a full
// ROUND_SIZE batch of unique random numbers is generated. Every generated
// number is guaranteed at least one real divisor from DIVISORS - a number
// with none would be a dead end under the tap-to-find-them-all gameplay
// (nothing to ever tap correctly, so the question could never complete).
export function generateRound(settings) {
  if (settings?.retryValues && settings.retryValues.length > 0) {
    return shuffle(settings.retryValues.map(buildQuestion))
  }

  const questions = []
  const seen = new Set()
  while (questions.length < ROUND_SIZE) {
    const value = randomNumber()
    if (seen.has(value)) continue
    if (actualDivisors(value).length === 0) continue
    seen.add(value)
    questions.push(buildQuestion(value))
  }
  return shuffle(questions)
}

export function describeSettings(settings) {
  if (settings?.retryValues && settings.retryValues.length > 0) {
    return `תרגול טעויות (${settings.retryValues.length} מספרים)`
  }
  return `סימני חלוקה · ${MIN_NUMBER}–${MAX_NUMBER}`
}
