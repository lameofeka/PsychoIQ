const STORAGE_KEY = 'psychoiq_primes_stats_v1'
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

export function recordPrimeResult(n, isCorrect) {
  const stats = loadStats()
  const key = String(n)
  const history = stats[key] ?? []
  history.push(isCorrect)
  if (history.length > WINDOW_SIZE) history.shift()
  stats[key] = history
  saveStats(stats)
}

export function getPrimeLevel(n) {
  const stats = loadStats()
  return levelFromHistory(stats[String(n)])
}
