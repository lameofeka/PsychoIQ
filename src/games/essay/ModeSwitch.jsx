export default function ModeSwitch({ mode, options, onChange }) {
  return (
    <div className="mode-switch">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`mode-switch-btn ${mode === opt.value ? 'active' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
