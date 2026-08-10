const STORAGE_KEY = 'psychoiq_powers_fact_stats_v1'
const WINDOW_SIZE = 6

function factKey(base, exponent) {
  return `${base}-${exponent}`
}

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

export function recordFactResult(base, exponent, isCorrect) {
  const stats = loadStats()
  const key = factKey(base, exponent)
  const history = stats[key] ?? []
  history.push(isCorrect)
  if (history.length > WINDOW_SIZE) history.shift()
  stats[key] = history
  saveStats(stats)
}

// Called the moment the buffered-retry queue's own "learned" criterion is
// met (RETRY_PASSES_NEEDED correct answers in a row after a miss) — forces
// this fact green immediately, instead of leaving it stuck at yellow/red
// because the earlier miss is still sitting in the rolling accuracy window.
export function markFactLearned(base, exponent) {
  const stats = loadStats()
  const key = factKey(base, exponent)
  stats[key] = Array(WINDOW_SIZE).fill(true)
  saveStats(stats)
}

export function getFactLevel(base, exponent) {
  const stats = loadStats()
  return levelFromHistory(stats[factKey(base, exponent)])
}

export function getWeakFactPairs(allPairs) {
  const stats = loadStats()
  return allPairs.filter(([base, exponent]) => levelFromHistory(stats[factKey(base, exponent)]) !== 'green')
}
