const STORAGE_KEY = 'psychoiq_vocab_dictionary_v1'
export const GROUP_SIZE = 10

function loadWords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveWords(words) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(words))
  } catch {
    // storage unavailable (private mode, quota, ...) — silently skip persistence
  }
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function getWords() {
  return loadWords()
}

export function addWord({ word, def, aas }) {
  const words = loadWords()
  words.push({ id: makeId(), word: word.trim(), def: def.trim(), aas: (aas ?? '').trim() })
  saveWords(words)
  return words
}

export function updateWord(id, { word, def, aas }) {
  const words = loadWords()
  const next = words.map((w) =>
    w.id === id ? { ...w, word: word.trim(), def: def.trim(), aas: (aas ?? '').trim() } : w,
  )
  saveWords(next)
  return next
}

export function deleteWord(id) {
  const words = loadWords().filter((w) => w.id !== id)
  saveWords(words)
  return words
}

export function swapWords(id1, id2) {
  const words = loadWords()
  const i1 = words.findIndex((w) => w.id === id1)
  const i2 = words.findIndex((w) => w.id === id2)
  if (i1 === -1 || i2 === -1 || i1 === i2) return words
  ;[words[i1], words[i2]] = [words[i2], words[i1]]
  saveWords(words)
  return words
}

export function importWords(entries) {
  const words = loadWords()
  for (const entry of entries) {
    if (!entry || typeof entry.word !== 'string' || typeof entry.def !== 'string') continue
    words.push({ id: makeId(), word: entry.word.trim(), def: entry.def.trim(), aas: (entry.Aas ?? '').trim() })
  }
  saveWords(words)
  return words
}

export function exportWords() {
  return loadWords().map((w) => ({ word: w.word, def: w.def, Aas: w.aas }))
}

export function getGroups(words) {
  const groups = []
  for (let i = 0; i < words.length; i += GROUP_SIZE) {
    groups.push({ index: groups.length + 1, words: words.slice(i, i + GROUP_SIZE) })
  }
  return groups
}
