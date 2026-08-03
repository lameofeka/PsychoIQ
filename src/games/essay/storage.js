const SENTENCES_KEY = 'psychoiq_essay_sentences_v1'
const SYNONYMS_KEY = 'psychoiq_essay_synonyms_v1'

function load(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage unavailable (private mode, quota, ...) — silently skip persistence
  }
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function moveItem(list, id, dir) {
  const i = list.findIndex((item) => item.id === id)
  const j = i + dir
  if (i === -1 || j < 0 || j >= list.length) return list
  const next = [...list]
  ;[next[i], next[j]] = [next[j], next[i]]
  return next
}

// --- Sentences (template mode) ---

export function getSentences() {
  return load(SENTENCES_KEY)
}

export function addSentence(text) {
  const sentences = load(SENTENCES_KEY)
  sentences.push({ id: makeId(), text: text.trim() })
  save(SENTENCES_KEY, sentences)
  return sentences
}

export function updateSentence(id, text) {
  const sentences = load(SENTENCES_KEY).map((s) => (s.id === id ? { ...s, text: text.trim() } : s))
  save(SENTENCES_KEY, sentences)
  return sentences
}

export function deleteSentence(id) {
  const sentences = load(SENTENCES_KEY).filter((s) => s.id !== id)
  save(SENTENCES_KEY, sentences)
  return sentences
}

export function moveSentence(id, dir) {
  const sentences = moveItem(load(SENTENCES_KEY), id, dir)
  save(SENTENCES_KEY, sentences)
  return sentences
}

// --- Synonym sets (synonyms mode) ---

export function getSynonymSets() {
  return load(SYNONYMS_KEY)
}

export function addSynonymSet(word) {
  const sets = load(SYNONYMS_KEY)
  sets.push({ id: makeId(), word: word.trim(), synonyms: [] })
  save(SYNONYMS_KEY, sets)
  return sets
}

export function updateSynonymSetWord(id, word) {
  const sets = load(SYNONYMS_KEY).map((s) => (s.id === id ? { ...s, word: word.trim() } : s))
  save(SYNONYMS_KEY, sets)
  return sets
}

export function deleteSynonymSet(id) {
  const sets = load(SYNONYMS_KEY).filter((s) => s.id !== id)
  save(SYNONYMS_KEY, sets)
  return sets
}

export function addSynonym(setId, text) {
  const sets = load(SYNONYMS_KEY).map((s) =>
    s.id === setId ? { ...s, synonyms: [...s.synonyms, { id: makeId(), text: text.trim() }] } : s,
  )
  save(SYNONYMS_KEY, sets)
  return sets
}

export function updateSynonym(setId, synId, text) {
  const sets = load(SYNONYMS_KEY).map((s) =>
    s.id === setId
      ? { ...s, synonyms: s.synonyms.map((syn) => (syn.id === synId ? { ...syn, text: text.trim() } : syn)) }
      : s,
  )
  save(SYNONYMS_KEY, sets)
  return sets
}

export function deleteSynonym(setId, synId) {
  const sets = load(SYNONYMS_KEY).map((s) =>
    s.id === setId ? { ...s, synonyms: s.synonyms.filter((syn) => syn.id !== synId) } : s,
  )
  save(SYNONYMS_KEY, sets)
  return sets
}

export function moveSynonym(setId, synId, dir) {
  const sets = load(SYNONYMS_KEY).map((s) =>
    s.id === setId ? { ...s, synonyms: moveItem(s.synonyms, synId, dir) } : s,
  )
  save(SYNONYMS_KEY, sets)
  return sets
}
