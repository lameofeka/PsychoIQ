export const OPERATIONS = {
  POWER: 'power',
  ROOT: 'root',
  COMBINED: 'combined',
}

export const RANGE_TYPES = {
  SINGLE: 'single',
  RANGE: 'range',
  ALL: 'all',
  WEAK: 'weak',
}

export const MIN_BASE = 2
export const MAX_BASE = 20
export const MIN_EXPONENT = 2

// The most exam-relevant powers/roots: small bases get many exponents,
// larger bases (which only ever show up squared) get just the one.
const BASE_MAX_EXPONENT = {
  2: 8,
  3: 5,
  4: 4,
  5: 4,
  6: 3,
  7: 3,
}

export function maxExponentForBase(base) {
  return BASE_MAX_EXPONENT[base] ?? MIN_EXPONENT
}

export function getAllFactPairs() {
  const pairs = []
  for (let base = MIN_BASE; base <= MAX_BASE; base++) {
    for (let exponent = MIN_EXPONENT; exponent <= maxExponentForBase(base); exponent++) {
      pairs.push([base, exponent])
    }
  }
  return pairs
}

const SUPERSCRIPT_DIGITS = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' }

function toSuperscript(n) {
  return String(n)
    .split('')
    .map((d) => SUPERSCRIPT_DIGITS[d])
    .join('')
}

function shuffle(list) {
  const arr = [...list]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function getPracticedBasePool(settings) {
  if (settings.rangeType === RANGE_TYPES.SINGLE) return [settings.singleBase]
  if (settings.rangeType === RANGE_TYPES.RANGE) {
    const from = Math.min(settings.rangeStart, settings.rangeEnd)
    const to = Math.max(settings.rangeStart, settings.rangeEnd)
    const pool = []
    for (let n = from; n <= to; n++) pool.push(n)
    return pool
  }
  const pool = []
  for (let n = MIN_BASE; n <= MAX_BASE; n++) pool.push(n)
  return pool
}

// Every question in the selected range, asked exactly once (like the
// vocabulary quiz going through every word once), instead of a random
// sample. Wrong answers are handled by the caller via a buffered retry queue.
export function getRoundQuestions(settings) {
  const pairs = []
  if (settings.rangeType === RANGE_TYPES.WEAK) {
    for (const pair of settings.factPairs) pairs.push(pair)
  } else {
    const pool = getPracticedBasePool(settings)
    for (const base of pool) {
      for (let exponent = MIN_EXPONENT; exponent <= maxExponentForBase(base); exponent++) {
        pairs.push([base, exponent])
      }
    }
  }

  const questions = pairs.map(([base, exponent], id) => {
    let operation = settings.operation
    if (operation === OPERATIONS.COMBINED) {
      operation = Math.random() < 0.5 ? OPERATIONS.POWER : OPERATIONS.ROOT
    }

    const value = base ** exponent

    if (operation === OPERATIONS.POWER) {
      return { id, operation, text: `${base}${toSuperscript(exponent)}`, answer: value, a: base, b: exponent }
    }

    const rootIndex = exponent === 2 ? '' : toSuperscript(exponent)
    return { id, operation, text: `${rootIndex}√${value}`, answer: base, a: base, b: exponent }
  })

  return settings.inOrder ? questions : shuffle(questions)
}

export function describeSettings(settings) {
  const opLabel = {
    [OPERATIONS.POWER]: 'חזקות',
    [OPERATIONS.ROOT]: 'שורשים',
    [OPERATIONS.COMBINED]: 'משולב',
  }[settings.operation]

  let rangeLabel
  if (settings.rangeType === RANGE_TYPES.SINGLE) {
    rangeLabel = `בסיס ${settings.singleBase}`
  } else if (settings.rangeType === RANGE_TYPES.RANGE) {
    const from = Math.min(settings.rangeStart, settings.rangeEnd)
    const to = Math.max(settings.rangeStart, settings.rangeEnd)
    rangeLabel = `בסיסים ${from}–${to}`
  } else if (settings.rangeType === RANGE_TYPES.WEAK) {
    rangeLabel = `תרגול חולשות (${settings.factPairs.length} חזקות)`
  } else {
    rangeLabel = 'כל הבסיסים הנפוצים'
  }

  return `${opLabel} · ${rangeLabel}`
}
