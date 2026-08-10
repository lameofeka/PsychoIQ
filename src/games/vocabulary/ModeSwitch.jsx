import { useRef } from 'react'

const DOUBLE_CLICK_WINDOW_MS = 280

export default function ModeSwitch({ mode, onChange, onDictionaryDoubleClick }) {
  const clickTimerRef = useRef(null)

  // A double-click still dispatches two click events before its own
  // dblclick — switching to the dictionary on the first click would already
  // navigate away before onDictionaryDoubleClick had a chance to fire. When
  // that handler is wired, hold the single-click action briefly to see if a
  // second click follows; otherwise (no handler passed in, e.g. from inside
  // the dictionary manager's own switch) act immediately as before.
  function handleDictionaryClick() {
    if (!onDictionaryDoubleClick) {
      onChange('dictionary')
      return
    }
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current)
      clickTimerRef.current = null
      return
    }
    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null
      onChange('dictionary')
    }, DOUBLE_CLICK_WINDOW_MS)
  }

  function handleDictionaryDoubleClick() {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current)
      clickTimerRef.current = null
    }
    onDictionaryDoubleClick?.()
  }

  return (
    <div className="mode-switch">
      <button
        type="button"
        className={`mode-switch-btn ${mode === 'dictionary' ? 'active' : ''}`}
        onClick={handleDictionaryClick}
        onDoubleClick={handleDictionaryDoubleClick}
      >
        מילון
      </button>
      <button
        type="button"
        className={`mode-switch-btn ${mode === 'practice' ? 'active' : ''}`}
        onClick={() => onChange('practice')}
      >
        תרגול
      </button>
    </div>
  )
}
