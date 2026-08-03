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

export default function ModeSwitch({ mode, onChange }) {
  return (
    <div className="mode-switch">
      <button
        type="button"
        className={`mode-switch-btn ${mode === 'dictionary' ? 'active' : ''}`}
        onClick={() => onChange('dictionary')}
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
