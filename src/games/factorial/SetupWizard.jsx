import { useState } from 'react'
import { OPERATIONS } from './logic'
import ProgressMap from './ProgressMap'

const OPERATION_OPTIONS = [
  { value: OPERATIONS.CALCULATE, label: 'מספר → תוצאה', icon: 'n!' },
  { value: OPERATIONS.IDENTIFY, label: 'תוצאה → מספר', icon: '?!' },
  { value: OPERATIONS.COMBINED, label: 'משולב', icon: '±' },
]

export default function SetupWizard({ initialSettings, onComplete, onPracticeWeak }) {
  const [operation, setOperation] = useState(initialSettings?.operation ?? OPERATIONS.CALCULATE)
  // Second tap on an already-selected "משולב" cube toggles between asking
  // every combination ("all", the default) and picking one at random per
  // question ("random", the quiz's older combined behavior).
  const [combinedMode, setCombinedMode] = useState(initialSettings?.combinedMode ?? 'all')

  const canStart = Boolean(operation)

  function start() {
    if (!canStart) return
    onComplete({ operation, combinedMode })
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
