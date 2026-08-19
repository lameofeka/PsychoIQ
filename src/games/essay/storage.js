import staticSentences from './sentences.data.json'
import staticSynonyms from './synonyms.data.json'

const SENTENCES_API = '/api/essay-sentences'
const SYNONYMS_API = '/api/essay-synonyms'

// In dev, these datasets live in the project (sentences.data.json /
// synonyms.data.json) and are served and written back to disk by a dev-only
// Vite middleware — not localStorage — so they're shared across every device
// that talks to this dev server instead of being siloed per browser. See
// vite.config.js for the /api/essay-* routes.
//
// Those routes only exist on the Vite dev server, not on a static host like
// Vercel, so production instead uses the bundled .data.json files. Editing
// from a deployed site won't persist — edit it locally (npm run dev) and
// redeploy to update what's shown in production.
//
// See dictionary.js for why the caches are stashed in import.meta.hot.data:
// HMR re-executes this module on every dev edit that touches its import
// chain, and without this, going "back" out of a quiz after an HMR reload
// would show empty data since the freshly-reset cache has nothing left to
// re-fetch it from.
let sentencesCache = import.meta.hot?.data.sentencesCache ?? []
let sentencesLoadPromise = import.meta.hot?.data.sentencesLoadPromise ?? null
let synonymsCache = import.meta.hot?.data.synonymsCache ?? []
let synonymsLoadPromise = import.meta.hot?.data.synonymsLoadPromise ?? null

if (import.meta.hot) {
  import.meta.hot.accept()
  import.meta.hot.dispose((data) => {
    data.sentencesCache = sentencesCache
    data.sentencesLoadPromise = sentencesLoadPromise
    data.synonymsCache = synonymsCache
    data.synonymsLoadPromise = synonymsLoadPromise
  })
}

function fetchJson(apiUrl, staticData) {
  if (!import.meta.env.DEV) return Promise.resolve(staticData)
  return fetch(apiUrl)
    .then((res) => {
      if (!res.ok) throw new Error(`GET ${apiUrl} failed: ${res.status}`)
      return res.json()
    })
    .then((data) => (Array.isArray(data) ? data : staticData))
    .catch(() => staticData)
}

export function loadTemplateData() {
  if (!sentencesLoadPromise) {
    sentencesLoadPromise = fetchJson(SENTENCES_API, staticSentences).then((data) => {
      sentencesCache = data
      return sentencesCache
    })
  }
  return sentencesLoadPromise
}

export function loadSynonymData() {
  if (!synonymsLoadPromise) {
    synonymsLoadPromise = fetchJson(SYNONYMS_API, staticSynonyms).then((data) => {
      synonymsCache = data
      return synonymsCache
    })
  }
  return synonymsLoadPromise
}

function persist(apiUrl, data) {
  if (!import.meta.env.DEV) return
  fetch(apiUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
    .then(async (res) => {
      if (res.ok) return
      // The server refuses saves that would shrink the data a lot (see
      // vite.config.js) — that means THIS tab's copy is stale. The rejected
      // edit is already reflected in this tab's local state (it was applied
      // optimistically before we knew the save would fail), so leaving it
      // as-is would make the data look like it lost entries even though the
      // real file on disk is untouched. Reload immediately so this tab
      // re-syncs to the real data instead of staying stuck on a stale, now-
      // misleading view.
      const body = await res.text().catch(() => '')
      alert(`השמירה נדחתה ולא בוצעה בפועל בקובץ! ייתכן שהטאב הזה אינו מסונכרן. הדף ייטען מחדש כעת.\n\n${body}`)
      window.location.reload()
    })
    .catch(() => {
      // dev server unreachable — the in-memory change still applies for this
      // session, it just won't be saved back to the .data.json file
    })
}

function saveSentences(sentences) {
  sentencesCache = sentences
  persist(SENTENCES_API, sentences)
}

function saveSynonymSets(sets) {
  synonymsCache = sets
  persist(SYNONYMS_API, sets)
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
  return sentencesCache
}

export function addSentence(text) {
  const sentences = [...sentencesCache, { id: makeId(), text: text.trim() }]
  saveSentences(sentences)
  return sentences
}

export function updateSentence(id, text) {
  const sentences = sentencesCache.map((s) => (s.id === id ? { ...s, text: text.trim() } : s))
  saveSentences(sentences)
  return sentences
}

export function deleteSentence(id) {
  const sentences = sentencesCache.filter((s) => s.id !== id)
  saveSentences(sentences)
  return sentences
}

export function moveSentence(id, dir) {
  const sentences = moveItem(sentencesCache, id, dir)
  saveSentences(sentences)
  return sentences
}

// --- Synonym sets (synonyms mode) ---

export function getSynonymSets() {
  return synonymsCache
}

export function addSynonymSet(word) {
  const sets = [...synonymsCache, { id: makeId(), word: word.trim(), synonyms: [] }]
  saveSynonymSets(sets)
  return sets
}

export function updateSynonymSetWord(id, word) {
  const sets = synonymsCache.map((s) => (s.id === id ? { ...s, word: word.trim() } : s))
  saveSynonymSets(sets)
  return sets
}

export function deleteSynonymSet(id) {
  const sets = synonymsCache.filter((s) => s.id !== id)
  saveSynonymSets(sets)
  return sets
}

export function swapSynonymSets(id1, id2) {
  const sets = [...synonymsCache]
  const i1 = sets.findIndex((s) => s.id === id1)
  const i2 = sets.findIndex((s) => s.id === id2)
  if (i1 === -1 || i2 === -1 || i1 === i2) return sets
  ;[sets[i1], sets[i2]] = [sets[i2], sets[i1]]
  saveSynonymSets(sets)
  return sets
}

export function addSynonym(setId, text) {
  const sets = synonymsCache.map((s) =>
    s.id === setId ? { ...s, synonyms: [...s.synonyms, { id: makeId(), text: text.trim() }] } : s,
  )
  saveSynonymSets(sets)
  return sets
}

// `usage` is an optional short note on how/when this synonym is used (e.g.
// "מאפשר" -> "להיתר למשהו חיובי") - most synonyms won't have one, so it's
// only touched when explicitly passed (undefined leaves it as-is).
export function updateSynonym(setId, synId, text, usage) {
  const sets = synonymsCache.map((s) =>
    s.id === setId
      ? {
          ...s,
          synonyms: s.synonyms.map((syn) =>
            syn.id === synId
              ? { ...syn, text: text.trim(), ...(usage !== undefined ? { usage: usage.trim() } : {}) }
              : syn,
          ),
        }
      : s,
  )
  saveSynonymSets(sets)
  return sets
}

export function deleteSynonym(setId, synId) {
  const sets = synonymsCache.map((s) =>
    s.id === setId ? { ...s, synonyms: s.synonyms.filter((syn) => syn.id !== synId) } : s,
  )
  saveSynonymSets(sets)
  return sets
}

export function moveSynonym(setId, synId, dir) {
  const sets = synonymsCache.map((s) =>
    s.id === setId ? { ...s, synonyms: moveItem(s.synonyms, synId, dir) } : s,
  )
  saveSynonymSets(sets)
  return sets
}
