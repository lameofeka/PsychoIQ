const STORAGE_KEY = 'psychoiq_vocab_group_stats_v1'
const WINDOW_SIZE = 5

const WORD_STORAGE_KEY = 'psychoiq_vocab_word_stats_v1'
const WORD_WINDOW_SIZE = 10

const LAST_GROUP_STORAGE_KEY = 'psychoiq_vocab_last_group_v1'

const LOCKED_MISTAKES_KEY = 'psychoiq_vocab_locked_mistakes_v1'
const EXCLUDED_MISTAKES_KEY = 'psychoiq_vocab_excluded_mistakes_v1'
const LOCK_MIGRATION_FLAG_KEY = 'psychoiq_vocab_lock_migration_v1'
const LOCK_MIGRATION_EXCLUDED_WORD = 'אסקופה'

function load(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function save(key, stats) {
  try {
    localStorage.setItem(key, JSON.stringify(stats))
  } catch {
    // storage unavailable (private mode, quota, ...) — silently skip persistence
  }
}

function levelFromHistory(history) {
  if (!history || history.length === 0) return 'unseen'
  const avg = history.reduce((sum, v) => sum + v, 0) / history.length
  if (avg >= 1) return 'green'
  if (avg >= 0.8) return 'yellow'
  return 'red'
}

export function recordGroupResult(groupIndex, correct, total) {
  if (total === 0) return
  const stats = load(STORAGE_KEY)
  const history = stats[groupIndex] ?? []
  history.push(correct / total)
  if (history.length > WINDOW_SIZE) history.shift()
  stats[groupIndex] = history
  save(STORAGE_KEY, stats)
}

export function getGroupLevel(groupIndex) {
  const stats = load(STORAGE_KEY)
  return levelFromHistory(stats[groupIndex])
}

export function setLastPracticedGroup(groupIndex) {
  try {
    localStorage.setItem(LAST_GROUP_STORAGE_KEY, String(groupIndex))
  } catch {
    // storage unavailable (private mode, quota, ...) — silently skip persistence
  }
}

export function getLastPracticedGroup() {
  try {
    const raw = localStorage.getItem(LAST_GROUP_STORAGE_KEY)
    return raw ? Number(raw) : null
  } catch {
    return null
  }
}

export function recordWordResult(wordId, isCorrect) {
  const stats = load(WORD_STORAGE_KEY)
  const history = stats[wordId] ?? []
  history.push(isCorrect)
  if (history.length > WORD_WINDOW_SIZE) history.shift()
  stats[wordId] = history
  save(WORD_STORAGE_KEY, stats)
}

function loadIdSet(key) {
  try {
    const raw = localStorage.getItem(key)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set()
  }
}

function saveIdSet(key, ids) {
  try {
    localStorage.setItem(key, JSON.stringify([...ids]))
  } catch {
    // storage unavailable (private mode, quota, ...) — silently skip persistence
  }
}

export function getLockedMistakeIds() {
  return loadIdSet(LOCKED_MISTAKES_KEY)
}

export function getExcludedMistakeIds() {
  return loadIdSet(EXCLUDED_MISTAKES_KEY)
}

// A locked word stays in the mistakes list even after it's answered
// correctly enough times to otherwise fall out of rankWeakWords.
export function lockMistake(wordId) {
  const ids = getLockedMistakeIds()
  ids.add(wordId)
  saveIdSet(LOCKED_MISTAKES_KEY, ids)

  const excluded = getExcludedMistakeIds()
  if (excluded.delete(wordId)) saveIdSet(EXCLUDED_MISTAKES_KEY, excluded)
}

export function unlockMistake(wordId) {
  const ids = getLockedMistakeIds()
  ids.delete(wordId)
  saveIdSet(LOCKED_MISTAKES_KEY, ids)
}

export function isMistakeLocked(wordId) {
  return getLockedMistakeIds().has(wordId)
}

// An excluded word never shows in the mistakes list, even if it's actually
// been answered wrong recently — a manual "stop showing me this one".
export function excludeMistake(wordId) {
  const ids = getExcludedMistakeIds()
  ids.add(wordId)
  saveIdSet(EXCLUDED_MISTAKES_KEY, ids)

  const locked = getLockedMistakeIds()
  if (locked.delete(wordId)) saveIdSet(LOCKED_MISTAKES_KEY, locked)
}

export function unexcludeMistake(wordId) {
  const ids = getExcludedMistakeIds()
  ids.delete(wordId)
  saveIdSet(EXCLUDED_MISTAKES_KEY, ids)
}

export function isMistakeExcluded(wordId) {
  return getExcludedMistakeIds().has(wordId)
}

// Whether a word is currently shown in the mistakes list: excluded always
// wins, then locked always shows, otherwise it's based on real answer history.
export function isWordInMistakesList(wordId) {
  if (isMistakeExcluded(wordId)) return false
  if (isMistakeLocked(wordId)) return true
  const stats = load(WORD_STORAGE_KEY)
  const history = stats[wordId]
  return !!history && history.some((v) => !v)
}

// Manual override from the dictionary editor: force a word in or out of the
// mistakes list regardless of its real answer history.
export function setWordInMistakesList(wordId, shouldInclude) {
  if (shouldInclude) lockMistake(wordId)
  else excludeMistake(wordId)
}

// Ranks words that have been answered wrong at least once, worst first,
// plus any locked words regardless of their current stats. Excluded words
// never appear, even if they'd otherwise qualify.
// Returns { word, wrongRate, wrongCount, locked } so callers can also show severity.
export function rankWeakWords(words) {
  const stats = load(WORD_STORAGE_KEY)
  const lockedIds = getLockedMistakeIds()
  const excludedIds = getExcludedMistakeIds()
  return words
    .map((word) => {
      if (excludedIds.has(word.id)) return null
      const history = stats[word.id]
      const wrongCount = history ? history.filter((v) => !v).length : 0
      const locked = lockedIds.has(word.id)
      if (!locked && wrongCount === 0) return null
      const wrongRate = history && history.length > 0 ? wrongCount / history.length : 0
      return { word, wrongRate, wrongCount, locked }
    })
    .filter(Boolean)
    .sort((a, b) => b.wrongRate - a.wrongRate || b.wrongCount - a.wrongCount)
}

// One-time migration: pins today's mistake-list words in place so future
// correct answers don't remove them, per explicit user request — skips the
// word "אסקופה" and anything already at green (low wrongRate) severity.
export function runMistakeLockMigrationOnce(words) {
  try {
    if (localStorage.getItem(LOCK_MIGRATION_FLAG_KEY)) return
  } catch {
    return
  }
  const ranked = rankWeakWords(words)
  const ids = getLockedMistakeIds()
  for (const { word, wrongRate } of ranked) {
    if (wrongRate < 0.2) continue
    if (word.word === LOCK_MIGRATION_EXCLUDED_WORD || word.def === LOCK_MIGRATION_EXCLUDED_WORD) continue
    ids.add(word.id)
  }
  saveLockedMistakeIds(ids)
  try {
    localStorage.setItem(LOCK_MIGRATION_FLAG_KEY, '1')
  } catch {
    // storage unavailable (private mode, quota, ...) — silently skip persistence
  }
}
