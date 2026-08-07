export const OPERATIONS = {
  MULTIPLY: 'multiply',
  DIVIDE: 'divide',
  COMBINED: 'combined',
}

export const RANGE_TYPES = {
  SINGLE: 'single',
  RANGE: 'range',
  ALL: 'all',
  WEAK: 'weak',
}

export const MIN_NUM = 1
export const MAX_NUM = 12

function shuffle(list) {
  const arr = [...list]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function getPracticedPool(settings) {
  if (settings.rangeType === RANGE_TYPES.SINGLE) return [settings.singleNumber]
  if (settings.rangeType === RANGE_TYPES.RANGE) {
    const from = Math.min(settings.rangeStart, settings.rangeEnd)
    const to = Math.max(settings.rangeStart, settings.rangeEnd)
    const pool = []
    for (let n = from; n <= to; n++) pool.push(n)
    return pool
  }
  const pool = []
  for (let n = MIN_NUM; n <= MAX_NUM; n++) pool.push(n)
  return pool
}

// Every question in the selected range, asked exactly once (like the
// vocabulary quiz going through every word once), instead of a random
// sample. Wrong answers are handled by the caller via a buffered retry queue.
export function getRoundQuestions(settings) {
  const pairs = []
  if (settings.rangeType === RANGE_TYPES.WEAK) {
    for (const [x, y] of settings.factPairs) {
      const flip = Math.random() < 0.5
      pairs.push(flip ? [x, y] : [y, x])
    }
  } else {
    const pool = getPracticedPool(settings)
    // A range (e.g. 3–6) only pairs numbers within that same range against
    // each other (3×3 up to 6×6). A single number still pairs against the
    // full 1–10 table, so every multiple of it shows up.
    const otherPool = settings.rangeType === RANGE_TYPES.RANGE ? pool : Array.from({ length: MAX_NUM - MIN_NUM + 1 }, (_, i) => MIN_NUM + i)
    for (const practiced of pool) {
      for (const other of otherPool) {
        pairs.push([practiced, other])
      }
    }
  }

  function buildQuestion(operation, practiced, other, id) {
    if (operation === OPERATIONS.MULTIPLY) {
      const flip = Math.random() < 0.5
      const a = flip ? practiced : other
      const b = flip ? other : practiced
      return { id, operation, text: `${a} × ${b}`, answer: a * b, a: practiced, b: other }
    }
    const dividend = practiced * other
    return { id, operation, text: `${dividend} ÷ ${practiced}`, answer: other, a: practiced, b: other }
  }

  const questions = []
  for (const [practiced, other] of pairs) {
    // "all" (the default) asks both multiply and divide for every pair;
    // "random" — the other tap of the "משולב" cube — picks one at random
    // per question instead, same as before that toggle existed.
    const operations =
      settings.operation === OPERATIONS.COMBINED
        ? settings.combinedMode === 'random'
          ? [Math.random() < 0.5 ? OPERATIONS.MULTIPLY : OPERATIONS.DIVIDE]
          : [OPERATIONS.MULTIPLY, OPERATIONS.DIVIDE]
        : [settings.operation]
    for (const operation of operations) {
      questions.push(buildQuestion(operation, practiced, other, questions.length))
    }
  }

  return shuffle(questions)
}

export function describeSettings(settings) {
  const opLabel = {
    [OPERATIONS.MULTIPLY]: 'כפל',
    [OPERATIONS.DIVIDE]: 'חילוק',
    [OPERATIONS.COMBINED]: 'משולב',
  }[settings.operation]

  let rangeLabel
  if (settings.rangeType === RANGE_TYPES.SINGLE) {
    rangeLabel = `כפולות של ${settings.singleNumber}`
  } else if (settings.rangeType === RANGE_TYPES.RANGE) {
    const from = Math.min(settings.rangeStart, settings.rangeEnd)
    const to = Math.max(settings.rangeStart, settings.rangeEnd)
    rangeLabel = `כפולות של ${from}–${to}`
  } else if (settings.rangeType === RANGE_TYPES.WEAK) {
    rangeLabel = `תרגול חולשות (${settings.factPairs.length} כפולות)`
  } else {
    rangeLabel = 'כל לוח הכפל'
  }

  return `${opLabel} · ${rangeLabel}`
}
