export const OPERATIONS = {
  DEGREES_TO_FRACTION: 'degreesToFraction',
  FRACTION_TO_DEGREES: 'fractionToDegrees',
  COMBINED: 'combined',
}

export const CIRCLE_FACTS = [
  { degrees: 120, numerator: 1, denominator: 3 },
  { degrees: 90, numerator: 1, denominator: 4 },
  { degrees: 72, numerator: 1, denominator: 5 },
  { degrees: 60, numerator: 1, denominator: 6 },
  { degrees: 45, numerator: 1, denominator: 8 },
  { degrees: 40, numerator: 1, denominator: 9 },
  { degrees: 36, numerator: 1, denominator: 10 },
  { degrees: 30, numerator: 1, denominator: 12 },
  { degrees: 240, numerator: 2, denominator: 3 },
  { degrees: 270, numerator: 3, denominator: 4 },
  { degrees: 144, numerator: 2, denominator: 5 },
]

export function shuffle(list) {
  const arr = [...list]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function fractionText(fact) {
  return `${fact.numerator}/${fact.denominator}`
}

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b)
}

// A circle fraction's percent equivalent isn't always a whole number
// (e.g. 1/3 = 33 1/3%), so the percent answer is itself a mixed number:
// a whole part plus an optional reduced numerator/denominator part.
function buildPercent(fact) {
  const rawNumerator = fact.numerator * 100
  const whole = Math.floor(rawNumerator / fact.denominator)
  const remainder = rawNumerator % fact.denominator

  if (remainder === 0) {
    return {
      whole,
      fracNumerator: null,
      fracDenominator: null,
      // Digits only, same concatenation convention as the main answer.
      answer: String(whole),
      displayAnswer: `${whole}%`,
    }
  }

  const divisor = gcd(remainder, fact.denominator)
  const fracNumerator = remainder / divisor
  const fracDenominator = fact.denominator / divisor
  return {
    whole,
    fracNumerator,
    fracDenominator,
    answer: `${whole}${fracNumerator}${fracDenominator}`,
    displayAnswer: `${whole} ${fracNumerator}/${fracDenominator}%`,
  }
}

function buildQuestion(fact, operation) {
  const id = `${fact.degrees}-${operation}`
  const percent = buildPercent(fact)

  if (operation === OPERATIONS.DEGREES_TO_FRACTION) {
    return {
      id,
      operation,
      prefix: `${fact.degrees}° = `,
      suffix: '',
      // Digits only (no "/"): the numerator/denominator fraction boxes in
      // GamePlay split this by fact.numerator's digit count, so comparison
      // just needs the two parts concatenated in order.
      answer: `${fact.numerator}${fact.denominator}`,
      displayAnswer: fractionText(fact),
      fact,
      percent,
    }
  }

  return {
    id,
    operation,
    prefix: `${fractionText(fact)} = `,
    suffix: '°',
    answer: String(fact.degrees),
    displayAnswer: String(fact.degrees),
    fact,
    percent,
  }
}

// One question per fact: single mode asks each fact once, combined asks
// each fact once per direction (e.g. 11 facts × 2 directions = 22).
export function generateRound(settings) {
  const pool = settings.weakFacts && settings.weakFacts.length > 0 ? settings.weakFacts : CIRCLE_FACTS
  const operations =
    settings.operation === OPERATIONS.COMBINED
      ? [OPERATIONS.DEGREES_TO_FRACTION, OPERATIONS.FRACTION_TO_DEGREES]
      : [settings.operation]

  const questions = []
  for (const fact of pool) {
    for (const operation of operations) {
      questions.push(buildQuestion(fact, operation))
    }
  }

  return shuffle(questions)
}

export function describeSettings(settings) {
  const opLabel = {
    [OPERATIONS.DEGREES_TO_FRACTION]: 'מעלות → שבר',
    [OPERATIONS.FRACTION_TO_DEGREES]: 'שבר → מעלות',
    [OPERATIONS.COMBINED]: 'משולב',
  }[settings.operation]

  if (settings.weakFacts && settings.weakFacts.length > 0) {
    return `${opLabel} · תרגול חולשות (${settings.weakFacts.length} חלקים)`
  }

  return `${opLabel} · כל חלקי המעגל (${CIRCLE_FACTS.length})`
}
