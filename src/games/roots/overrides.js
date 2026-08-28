const STORAGE_KEY = 'psychoiq_roots_example_overrides_v1'

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

export function getAllExampleOverrides() {
  return loadOverrides()
}

export function setExampleOverride(rootId, example) {
  const overrides = loadOverrides()
  const trimmed = example.trim()
  if (trimmed) overrides[rootId] = trimmed
  else delete overrides[rootId]
  saveOverrides(overrides)
}

// The example word shown for a root, preferring a user edit over the built-in one.
export function exampleFor(root) {
  return loadOverrides()[root.id] ?? root.example
}
