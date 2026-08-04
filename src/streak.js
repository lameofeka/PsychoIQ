const STORAGE_KEY = 'psychoiq_streak_v1'

function dateKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function yesterdayKeyOf(today) {
  const [y, m, d] = today.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() - 1)
  return dateKey(date)
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function save(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // storage unavailable (private mode, quota, ...) — silently skip persistence
  }
}

// Marks today as visited and returns the current consecutive-day streak.
// A visit on the day right after the last recorded one extends the streak;
// any gap (or first-ever visit) resets it to 1. Calling this more than
// once on the same day is a no-op that just returns the existing count.
export function recordVisitAndGetStreak() {
  const today = dateKey(new Date())
  const stored = load()

  if (stored?.lastDate === today) {
    return stored.streak
  }

  const streak = stored?.lastDate === yesterdayKeyOf(today) ? stored.streak + 1 : 1
  save({ lastDate: today, streak })
  return streak
}
