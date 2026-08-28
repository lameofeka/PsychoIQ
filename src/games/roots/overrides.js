const STORAGE_KEY = 'psychoiq_roots_overrides_v2'

function loadOverrides() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveOverrides(overrides) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides))
  } catch {
    // storage unavailable (private mode, quota, ...) — silently skip persistence
  }
}

// `patch` only needs to carry the fields that changed - it's merged onto
// whatever's already stored for this root, and that in turn is merged onto
// the built-in ROOTS entry by getEffectiveRoot.
export function setRootOverride(rootId, patch) {
  const overrides = loadOverrides()
  overrides[rootId] = { ...overrides[rootId], ...patch }
  saveOverrides(overrides)
}

// The root's data with any user edits layered on top - what gameplay, the
// progress map, and the edit popup should all read through instead of the
// raw ROOTS entry.
export function getEffectiveRoot(root) {
  const override = loadOverrides()[root.id]
  return override ? { ...root, ...override } : root
}

export function exampleFor(root) {
  return getEffectiveRoot(root).example
}
