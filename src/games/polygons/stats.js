const STORAGE_KEY = 'psychoiq_polygons_fact_stats_v1'
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

export function recordFactResult(sides, isCorrect) {
  const stats = loadStats()
  const history = stats[sides] ?? []
  history.push(isCorrect)
  if (history.length > WINDOW_SIZE) history.shift()
  stats[sides] = history
  saveStats(stats)
}

// Called the moment the buffered-retry queue's own "learned" criterion is
// met (RETRY_PASSES_NEEDED correct answers in a row after a miss) — forces
// this fact green immediately, instead of leaving it stuck at yellow/red
// because the earlier miss is still sitting in the rolling accuracy window.
export function markFactLearned(sides) {
  const stats = loadStats()
  stats[sides] = Array(WINDOW_SIZE).fill(true)
  saveStats(stats)
}

export function getFactLevel(sides) {
  const stats = loadStats()
  return levelFromHistory(stats[sides])
}

export function getWeakNumbers(allSides) {
  const stats = loadStats()
  return allSides.filter((sides) => levelFromHistory(stats[sides]) !== 'green')
}
