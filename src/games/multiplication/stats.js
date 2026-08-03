import { MIN_NUM, MAX_NUM } from './logic'

const STORAGE_KEY = 'psychoiq_mult_fact_stats_v1'
const WINDOW_SIZE = 6

function factKey(a, b) {
  const lo = Math.min(a, b)
  const hi = Math.max(a, b)
  return `${lo}-${hi}`
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

export function recordFactResult(a, b, isCorrect) {
  const stats = loadStats()
  const key = factKey(a, b)
  const history = stats[key] ?? []
  history.push(isCorrect)
  if (history.length > WINDOW_SIZE) history.shift()
  stats[key] = history
  saveStats(stats)
}

export function getFactLevel(a, b) {
  const stats = loadStats()
  return levelFromHistory(stats[factKey(a, b)])
}

export function getWeakFactPairs(min = MIN_NUM, max = MAX_NUM) {
  const stats = loadStats()
  const pairs = []
  for (let a = min; a <= max; a++) {
    for (let b = a; b <= max; b++) {
      if (levelFromHistory(stats[factKey(a, b)]) !== 'green') pairs.push([a, b])
    }
  }
  return pairs
}
