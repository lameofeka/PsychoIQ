const STORAGE_KEY = 'psychoiq_roots_fact_stats_v1'
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

// A root's meaning and one of its example words are separate things to know
// (spotting "רע, לקוי" doesn't mean "Malevolent" comes just as easily), so
// each gets its own rolling-accuracy key, same split as circleParts'
// fraction/percent keys.
export function meaningKey(rootId) {
  return `${rootId}-meaning`
}

export function wordKey(rootId) {
  return `${rootId}-word`
}

function levelFromHistory(history) {
  if (!history || history.length === 0) return 'unseen'
  const correct = history.filter(Boolean).length
  const accuracy = correct / history.length
  if (accuracy >= 0.8) return 'green'
  if (accuracy >= 0.5) return 'yellow'
  return 'red'
}

export function recordFactResult(key, isCorrect) {
  const stats = loadStats()
  const history = stats[key] ?? []
  history.push(isCorrect)
  if (history.length > WINDOW_SIZE) history.shift()
  stats[key] = history
  saveStats(stats)
}

// Called the moment the buffered-retry queue's own "learned" criterion is
// met (RETRY_PASSES_NEEDED correct answers in a row after a miss) — forces
// this key green immediately instead of leaving it stuck at yellow/red
// because the earlier miss is still sitting in the rolling accuracy window.
export function markFactLearned(key) {
  const stats = loadStats()
  stats[key] = Array(WINDOW_SIZE).fill(true)
  saveStats(stats)
}

export function getFactLevel(key) {
  const stats = loadStats()
  return levelFromHistory(stats[key])
}

export function getWeakKeys(allKeys) {
  const stats = loadStats()
  return allKeys.filter((key) => levelFromHistory(stats[key]) !== 'green')
}
