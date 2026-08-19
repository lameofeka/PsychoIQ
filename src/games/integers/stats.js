import { LAWS, FRACTION_ROWS, PRODUCT_FACTS } from './logic'

const STORAGE_KEY = 'psychoiq_integers_stats_v1'
const WINDOW_SIZE = 6

function loadStats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveStats(stats) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats))
  } catch {
    // storage unavailable (private mode, quota, ...) — silently skip persistence
  }
}

function levelFromHistory(history) {
  if (!history || history.length === 0) return 'unseen'
  const correct = history.filter(Boolean).length
  const accuracy = correct / history.length
  if (accuracy >= 0.8) return 'green'
  if (accuracy >= 0.5) return 'yellow'
  return 'red'
}

function pushResult(key, isCorrect) {
  const stats = loadStats()
  const history = stats[key] ?? []
  history.push(isCorrect)
  if (history.length > WINDOW_SIZE) history.shift()
  stats[key] = history
  saveStats(stats)
}

function markLearned(key) {
  const stats = loadStats()
  stats[key] = Array(WINDOW_SIZE).fill(true)
  saveStats(stats)
}

// Laws 1/2 (סימנים, זוגי/אי-זוגי) generate a fresh random question every
// time — there's no fixed fact to key mastery on, so progress is tracked as
// one rolling window per law instead of per individual question.
export function recordLawResult(law, isCorrect) {
  pushResult(`law:${law}`, isCorrect)
}

export function getLawLevel(law) {
  return levelFromHistory(loadStats()[`law:${law}`])
}

// Laws 3/4 (חילוק ושברים, מכפלות מיוחדות) are small closed fact sets, so —
// like every other quant quiz's per-fact stats — each row/fact gets its own
// rolling window, keyed by its fixed index into FRACTION_ROWS/PRODUCT_FACTS.
// Both blank directions/variants of the same row/fact feed the same window.
export function recordFractionRowResult(rowIndex, isCorrect) {
  pushResult(`fraction:${rowIndex}`, isCorrect)
}

export function getFractionRowLevel(rowIndex) {
  return levelFromHistory(loadStats()[`fraction:${rowIndex}`])
}

export function markFractionRowLearned(rowIndex) {
  markLearned(`fraction:${rowIndex}`)
}

export function recordProductFactResult(factIndex, isCorrect) {
  pushResult(`product:${factIndex}`, isCorrect)
}

export function getProductFactLevel(factIndex) {
  return levelFromHistory(loadStats()[`product:${factIndex}`])
}

export function markProductFactLearned(factIndex) {
  markLearned(`product:${factIndex}`)
}

// Feeds the platform-wide mastery % in overallProgress.js - each law
// aggregate and each law-3/4 fact counts as one "green or not" unit,
// same shape as every other quiz's {green, total} contribution.
export function integersMasteryCounts() {
  let green = 0
  if (getLawLevel(LAWS.SIGN) === 'green') green++
  if (getLawLevel(LAWS.PARITY) === 'green') green++
  FRACTION_ROWS.forEach((_, i) => {
    if (getFractionRowLevel(i) === 'green') green++
  })
  PRODUCT_FACTS.forEach((_, i) => {
    if (getProductFactLevel(i) === 'green') green++
  })
  return { green, total: 2 + FRACTION_ROWS.length + PRODUCT_FACTS.length }
}
