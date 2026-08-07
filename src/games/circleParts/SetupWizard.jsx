import { useState } from 'react'
import { OPERATIONS } from './logic'
import ProgressMap from './ProgressMap'

const OPERATION_OPTIONS = [
  { value: OPERATIONS.DEGREES_TO_FRACTION, label: 'שבר → מעלות', icon: '⅓→°' },
  { value: OPERATIONS.FRACTION_TO_DEGREES, label: 'מעלות → שבר', icon: '°→⅓' },
  { value: OPERATIONS.COMBINED, label: 'משולב', icon: '±' },
]

export default function SetupWizard({ initialSettings, onComplete, onPracticeWeak }) {
  const [operation, setOperation] = useState(initialSettings?.operation ?? OPERATIONS.DEGREES_TO_FRACTION)
  // Second tap on an already-selected "משולב" cube toggles between asking
  // every combination ("all", the default) and picking one at random per
  // question ("random", the quiz's older combined behavior).
  const [combinedMode, setCombinedMode] = useState(initialSettings?.combinedMode ?? 'all')
  const [inOrder, setInOrder] = useState(initialSettings?.inOrder ?? false)

  const canStart = Boolean(operation)

  function start() {
    if (!canStart) return
    onComplete({ operation, combinedMode, inOrder })
  }

  function pickOperation(value) {
    if (value === OPERATIONS.COMBINED && operation === OPERATIONS.COMBINED) {
      setCombinedMode((m) => (m === 'random' ? 'all' : 'random'))
    } else {
      setOperation(value)
    }
  }

  return (
    <div className="wizard-stack">
      <div className="wizard setup-compact">
        <div className="setup-section">
          <div className="operation-row">
            {OPERATION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`operation-cube ${operation === opt.value ? 'selected' : ''}`}
                onClick={() => pickOperation(opt.value)}
              >
                <span className="option-icon">{opt.icon}</span>
                <span>{opt.label}</span>
                {opt.value === OPERATIONS.COMBINED && operation === OPERATIONS.COMBINED && (
                  <span className="combined-mode-hint">{combinedMode === 'random' ? 'אקראי' : 'כל הסוגים'}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="in-order-row">
          <span className="in-order-label">לפי הסדר</span>
          <button
            type="button"
            role="switch"
            aria-checked={inOrder}
            className={`toggle-switch ${inOrder ? 'checked' : ''}`}
            onClick={() => setInOrder((v) => !v)}
            title="מצב שרשרת"
          >
            <span className="toggle-knob" />
          </button>
        </div>

        <button className="primary-btn big" disabled={!canStart} onClick={start}>
          התחל תרגול
        </button>
      </div>

      <div className="wizard setup-compact">
        <ProgressMap onPracticeWeak={onPracticeWeak} />
      </div>
    </div>
  )
}
