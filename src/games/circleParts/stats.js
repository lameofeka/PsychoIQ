const STORAGE_KEY = 'psychoiq_circleparts_fact_stats_v1'
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

export function recordFactResult(degrees, isCorrect) {
  const stats = loadStats()
  const history = stats[degrees] ?? []
  history.push(isCorrect)
  if (history.length > WINDOW_SIZE) history.shift()
  stats[degrees] = history
  saveStats(stats)
}

export function getFactLevel(degrees) {
  const stats = loadStats()
  return levelFromHistory(stats[degrees])
}

export function getWeakNumbers(allDegrees) {
  const stats = loadStats()
  return allDegrees.filter((degrees) => levelFromHistory(stats[degrees]) !== 'green')
}
