import { useRef } from 'react'

const DOUBLE_CLICK_WINDOW_MS = 280

function DictionaryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5c2.5-1 5-1 8 0v14c-3-1-5.5-1-8 0V5Z" />
      <path d="M20 5c-2.5-1-5-1-8 0v14c3-1 5.5-1 8 0V5Z" />
    </svg>
  )
}

function PracticeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 19.5l1-4L14 6l3 3-8.5 8.5-4 1Z" />
      <path d="M12.5 7.5l3 3" />
    </svg>
  )
}

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
        <DictionaryIcon />
        מילון
      </button>
      <button
        type="button"
        className={`mode-switch-btn ${mode === 'practice' ? 'active' : ''}`}
        onClick={() => onChange('practice')}
      >
        <PracticeIcon />
        תרגול
      </button>
    </div>
  )
}
