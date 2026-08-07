export const OPERATIONS = {
  CALCULATE: 'calculate',
  IDENTIFY: 'identify',
  COMBINED: 'combined',
}

export const MIN_N = 1
export const MAX_N = 6

export function factorial(n) {
  let result = 1
  for (let i = 2; i <= n; i++) result *= i
  return result
}

export function getAllFacts() {
  const facts = []
  for (let n = MIN_N; n <= MAX_N; n++) facts.push(n)
  return facts
}

export function shuffle(list) {
  const arr = [...list]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function buildQuestion(n, operation) {
  const value = factorial(n)
  const id = `${n}-${operation}`

  if (operation === OPERATIONS.CALCULATE) {
    return {
      id,
      operation,
      prefix: `${n}! = `,
      suffix: '',
      answer: value,
      n,
    }
  }

  return {
    id,
    operation,
    prefix: '',
    suffix: `! = ${value}`,
    answer: n,
    n,
  }
}

// One question per fact: single mode asks each number once. Combined mode
// has two sub-modes, toggled by a second tap on the "משולב" cube: "all" (the
// default) asks each number once per operation (e.g. 6 numbers × 2
// operations = 12); "random" asks each number once, picking one of the two
// operations at random.
export function generateRound(settings) {
  const pool = settings.weakNumbers && settings.weakNumbers.length > 0 ? settings.weakNumbers : getAllFacts()

  const questions = []
  for (const n of pool) {
    const operations =
      settings.operation === OPERATIONS.COMBINED
        ? settings.combinedMode === 'random'
          ? [Math.random() < 0.5 ? OPERATIONS.CALCULATE : OPERATIONS.IDENTIFY]
          : [OPERATIONS.CALCULATE, OPERATIONS.IDENTIFY]
        : [settings.operation]
    for (const operation of operations) {
      questions.push(buildQuestion(n, operation))
    }
  }

  return shuffle(questions)
}

export function describeSettings(settings) {
  const opLabel = {
    [OPERATIONS.CALCULATE]: 'מספר → תוצאה',
    [OPERATIONS.IDENTIFY]: 'תוצאה → מספר',
    [OPERATIONS.COMBINED]: 'משולב',
  }[settings.operation]

  if (settings.weakNumbers && settings.weakNumbers.length > 0) {
    return `${opLabel} · תרגול חולשות (${settings.weakNumbers.length} מספרים)`
  }

  return `${opLabel} · מספרים ${MIN_N}–${MAX_N}`
}
