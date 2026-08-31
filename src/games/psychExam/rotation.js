const STORAGE_PREFIX = 'psychExamOrder:'

function storageKey(category) {
  return `${STORAGE_PREFIX}${category}`
}

function shuffle(list) {
  const result = list.slice()
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// Loads the persisted rotation order for a category, reconciled against the
// current question pool: ids no longer in the pool are dropped, new ids
// (e.g. once more exams are added to the bank) are appended in shuffled
// order. Falls back to a fresh shuffle when nothing is stored yet.
//
// The rotation itself is a plain FIFO: the front of the array is "up next",
// and answering a question moves it to the back (see PsychExamGame's
// handleAdvance) — so a question can only come back around once every other
// question in the pool has been shown. Because a full rotation preserves
// relative order (each id is visited once and moved once, in place), placing
// every "priority" id before every other id — both in a fresh shuffle and
// when splicing in newly-added ids — makes that ordering repeat every
// round, not just the first time through.
export function loadOrder(category, poolIds, isPriority = () => false) {
  const priority = shuffle(poolIds.filter(isPriority))
  const rest = shuffle(poolIds.filter((id) => !isPriority(id)))

  let stored = null
  try {
    const raw = localStorage.getItem(storageKey(category))
    if (raw) stored = JSON.parse(raw)
  } catch {
    stored = null
  }

  if (!Array.isArray(stored)) {
    return [...priority, ...rest]
  }

  const poolSet = new Set(poolIds)
  const kept = stored.filter((id) => poolSet.has(id))
  const keptSet = new Set(kept)
  const missingPriority = shuffle(poolIds.filter((id) => !keptSet.has(id) && isPriority(id)))
  const missingRest = shuffle(poolIds.filter((id) => !keptSet.has(id) && !isPriority(id)))
  return [...missingPriority, ...kept, ...missingRest]
}

export function saveOrder(category, order) {
  try {
    localStorage.setItem(storageKey(category), JSON.stringify(order))
  } catch {
    // storage unavailable (private browsing, quota) — rotation just won't persist
  }
}
