const STORAGE_KEY = 'psychoiq_pythagoras_fact_stats_v1'
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

export function recordFactResult(tripleId, isCorrect) {
  const stats = loadStats()
  const history = stats[tripleId] ?? []
  history.push(isCorrect)
  if (history.length > WINDOW_SIZE) history.shift()
  stats[tripleId] = history
  saveStats(stats)
}

export function getFactLevel(tripleId) {
  const stats = loadStats()
  return levelFromHistory(stats[tripleId])
}

export function getWeakIds(allIds) {
  const stats = loadStats()
  return allIds.filter((id) => levelFromHistory(stats[id]) !== 'green')
}
