const SYNONYM_STORAGE_KEY = 'psychoiq_essay_synonym_stats_v1'
const SENTENCE_STORAGE_KEY = 'psychoiq_essay_sentence_stats_v1'
const WINDOW_SIZE = 6

function loadStats(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveStats(key, stats) {
  try {
    localStorage.setItem(key, JSON.stringify(stats))
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

function recordResult(key, id, isCorrect) {
  const stats = loadStats(key)
  const history = stats[id] ?? []
  history.push(isCorrect)
  if (history.length > WINDOW_SIZE) history.shift()
  stats[id] = history
  saveStats(key, stats)
}

function getLevel(key, id) {
  const stats = loadStats(key)
  return levelFromHistory(stats[id])
}

function getWeakIds(key, ids) {
  const stats = loadStats(key)
  return ids.filter((id) => levelFromHistory(stats[id]) !== 'green')
}

// --- Synonym sets (one entry per "simple word", tracked across every
// practice round regardless of how many of its synonyms were typed vs
// revealed) ---

export function recordSynonymSetResult(setId, isCorrect) {
  recordResult(SYNONYM_STORAGE_KEY, setId, isCorrect)
}

export function getSynonymSetLevel(setId) {
  return getLevel(SYNONYM_STORAGE_KEY, setId)
}

export function getWeakSynonymSetIds(ids) {
  return getWeakIds(SYNONYM_STORAGE_KEY, ids)
}

// --- Template sentences (one entry per sentence, per pass through the
// sequence it's typed in) ---

export function recordSentenceResult(sentenceId, isCorrect) {
  recordResult(SENTENCE_STORAGE_KEY, sentenceId, isCorrect)
}

export function getSentenceLevel(sentenceId) {
  return getLevel(SENTENCE_STORAGE_KEY, sentenceId)
}

export function getWeakSentenceIds(ids) {
  return getWeakIds(SENTENCE_STORAGE_KEY, ids)
}
