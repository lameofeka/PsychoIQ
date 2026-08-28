import staticRoots from './roots.data.json'

const API_URL = '/api/roots'

// Same dev-server-backed-file approach as vocabulary/dictionary.js (see its
// comments for the full explanation): the dataset lives in the project as a
// .data.json file, edited in place through a dev-only Vite middleware, and
// falls back to the bundled snapshot in production (where that route
// doesn't exist) or on a fetch failure.
let rootsCache = import.meta.hot?.data.rootsCache ?? []
let loadPromise = import.meta.hot?.data.loadPromise ?? null

if (import.meta.hot) {
  import.meta.hot.accept()
  import.meta.hot.dispose((data) => {
    data.rootsCache = rootsCache
    data.loadPromise = loadPromise
  })
}

export function loadDictionary() {
  if (!loadPromise) {
    if (import.meta.env.DEV) {
      loadPromise = fetch(API_URL)
        .then((res) => {
          if (!res.ok) throw new Error(`GET ${API_URL} failed: ${res.status}`)
          return res.json()
        })
        .then((roots) => {
          rootsCache = Array.isArray(roots) ? roots : staticRoots
          return rootsCache
        })
        .catch(() => {
          rootsCache = staticRoots
          return rootsCache
        })
    } else {
      rootsCache = staticRoots
      loadPromise = Promise.resolve(rootsCache)
    }
  }
  return loadPromise
}

function persist(roots) {
  if (!import.meta.env.DEV) return
  fetch(API_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(roots),
  })
    .then(async (res) => {
      if (res.ok) return
      const body = await res.text().catch(() => '')
      alert(`השמירה נדחתה ולא בוצעה בפועל בקובץ! ייתכן שהטאב הזה אינו מסונכרן. הדף ייטען מחדש כעת.\n\n${body}`)
      window.location.reload()
    })
    .catch(() => {
      // dev server unreachable — the in-memory change still applies for this
      // session, it just won't be saved back to roots.data.json
    })
}

function saveRoots(roots) {
  rootsCache = roots
  persist(roots)
}

export function getRoots() {
  return rootsCache
}

export function updateRoot(id, { root, meaning, example }) {
  const next = rootsCache.map((r) =>
    r.id === id ? { ...r, root: root.trim(), meaning: meaning.trim(), example: example.trim() } : r,
  )
  saveRoots(next)
  return next
}
