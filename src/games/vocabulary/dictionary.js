import staticWords from './words.data.json'

const API_URL = '/api/vocabulary'
export const GROUP_SIZE = 10

// In dev, the dictionary lives in the project (words.data.json) and is served
// and written back to disk by a dev-only Vite middleware — not localStorage —
// so the word list is shared across every device that talks to this dev
// server instead of being siloed per browser. See vite.config.js for the
// /api/vocabulary route.
//
// That route only exists on the Vite dev server, not on a static host like
// Vercel, so production instead uses words.data.json baked straight into the
// build. Editing the dictionary from a deployed site won't persist — edit it
// locally (npm run dev) and redeploy to update what's shown in production.
let wordsCache = []
let loadPromise = null

export function loadDictionary() {
  if (!loadPromise) {
    if (import.meta.env.DEV) {
      loadPromise = fetch(API_URL)
        .then((res) => {
          if (!res.ok) throw new Error(`GET ${API_URL} failed: ${res.status}`)
          return res.json()
        })
        .then((words) => {
          wordsCache = Array.isArray(words) ? words : staticWords
          return wordsCache
        })
        .catch(() => {
          // Server read failed or returned something unusable — fall back to
          // the bundled snapshot rather than an empty list, so a transient
          // error can't masquerade as "the dictionary is empty" and get an
          // add/edit persisted on top of it, wiping the real file.
          wordsCache = staticWords
          return wordsCache
        })
    } else {
      wordsCache = staticWords
      loadPromise = Promise.resolve(wordsCache)
    }
  }
  return loadPromise
}

function persist(words) {
  if (!import.meta.env.DEV) return
  fetch(API_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(words),
  })
    .then(async (res) => {
      if (res.ok) return
      // The server refuses saves that would shrink the dictionary a lot
      // (see vite.config.js) — that means THIS tab's copy is stale. The
      // rejected edit is already reflected in this tab's local state (it was
      // applied optimistically before we knew the save would fail), so
      // leaving it as-is would make the dictionary look like it lost words
      // even though the real file on disk is untouched. Reload immediately
      // so this tab re-syncs to the real data instead of staying stuck on a
      // stale, now-misleading view.
      const body = await res.text().catch(() => '')
      alert(`השמירה נדחתה ולא בוצעה בפועל בקובץ! ייתכן שהטאב הזה אינו מסונכרן. הדף ייטען מחדש כעת.\n\n${body}`)
      window.location.reload()
    })
    .catch(() => {
      // dev server unreachable — the in-memory change still applies for this
      // session, it just won't be saved back to words.data.json
    })
}

function saveWords(words) {
  wordsCache = words
  persist(words)
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function getWords() {
  return wordsCache
}

export function addWord({ word, def, aas }) {
  const words = [...wordsCache, { id: makeId(), word: word.trim(), def: def.trim(), aas: (aas ?? '').trim() }]
  saveWords(words)
  return words
}

export function updateWord(id, { word, def, aas }) {
  const next = wordsCache.map((w) =>
    w.id === id ? { ...w, word: word.trim(), def: def.trim(), aas: (aas ?? '').trim() } : w,
  )
  saveWords(next)
  return next
}

export function deleteWord(id) {
  const next = wordsCache.filter((w) => w.id !== id)
  saveWords(next)
  return next
}

export function swapWords(id1, id2) {
  const words = [...wordsCache]
  const i1 = words.findIndex((w) => w.id === id1)
  const i2 = words.findIndex((w) => w.id === id2)
  if (i1 === -1 || i2 === -1 || i1 === i2) return words
  ;[words[i1], words[i2]] = [words[i2], words[i1]]
  saveWords(words)
  return words
}

export function importWords(entries) {
  const words = [...wordsCache]
  for (const entry of entries) {
    if (!entry || typeof entry.word !== 'string' || typeof entry.def !== 'string') continue
    words.push({ id: makeId(), word: entry.word.trim(), def: entry.def.trim(), aas: (entry.Aas ?? '').trim() })
  }
  saveWords(words)
  return words
}

export function exportWords() {
  return wordsCache.map((w) => ({ word: w.word, def: w.def, Aas: w.aas }))
}

export function getGroups(words) {
  const groups = []
  for (let i = 0; i < words.length; i += GROUP_SIZE) {
    groups.push({ index: groups.length + 1, words: words.slice(i, i + GROUP_SIZE) })
  }
  return groups
}
