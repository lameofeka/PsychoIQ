const STORAGE_KEY = 'psychoiq_division_fact_stats_v1'
const WINDOW_SIZE = 6
const BEST_STREAK_KEY = 'psychoiq_division_best_streak_v1'

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

// Every question tests all divisors at once (the user marks the full set
// that applies), so this is called once per divisor per submitted answer -
// not once per question like the other quizzes' recordFactResult.
export function recordDivisorResult(n, isCorrect) {
  const stats = loadStats()
  const history = stats[n] ?? []
  history.push(isCorrect)
  if (history.length > WINDOW_SIZE) history.shift()
  stats[n] = history
  saveStats(stats)
}

export function getFactLevel(n) {
  const stats = loadStats()
  return levelFromHistory(stats[n])
}

export function getWeakNumbers(allNumbers) {
  const stats = loadStats()
  return allNumbers.filter((n) => levelFromHistory(stats[n]) !== 'green')
}

// The endless quiz's running streak (numbers solved in a row with no wrong
// tap) - only the best one ever reached is kept, shown on the setup screen.
export function getBestStreak() {
  try {
    return Number(localStorage.getItem(BEST_STREAK_KEY)) || 0
  } catch {
    return 0
  }
}

export function recordStreakIfBest(streak) {
  if (streak <= getBestStreak()) return
  try {
    localStorage.setItem(BEST_STREAK_KEY, String(streak))
  } catch {
    // storage unavailable (private mode, quota, ...) — silently skip persistence
  }
}
