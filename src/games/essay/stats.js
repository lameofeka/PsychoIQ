const SYNONYM_STORAGE_KEY = 'psychoiq_essay_synonym_item_stats_v1'
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

// --- Synonyms (one entry per individual synonym, not per word - so the
// progress map can show exactly which synonyms of a given word are
// remembered and which aren't, instead of a single blended score per word) ---

export function recordSynonymResult(synonymId, isCorrect) {
  recordResult(SYNONYM_STORAGE_KEY, synonymId, isCorrect)
}

export function getSynonymLevel(synonymId) {
  return getLevel(SYNONYM_STORAGE_KEY, synonymId)
}

// A word's own level is the worst level among its synonyms - "green" only
// once every synonym is mastered, so a single still-shaky synonym is enough
// to flag the whole word as needing more practice.
const LEVEL_RANK = { red: 0, yellow: 1, unseen: 2, green: 3 }

export function getSynonymSetLevel(set) {
  if (!set.synonyms || set.synonyms.length === 0) return 'unseen'
  return set.synonyms
    .map((syn) => getSynonymLevel(syn.id))
    .reduce((worst, level) => (LEVEL_RANK[level] < LEVEL_RANK[worst] ? level : worst))
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
