import { useState } from 'react'
import { OPERATIONS, describeSettings } from './logic'
import ProgressMap from './ProgressMap'

const OPERATION_OPTIONS = [
  { value: OPERATIONS.DEGREES_TO_FRACTION, label: 'מעלות → שבר', icon: '°→⅓' },
  { value: OPERATIONS.FRACTION_TO_DEGREES, label: 'שבר → מעלות', icon: '⅓→°' },
  { value: OPERATIONS.COMBINED, label: 'משולב', icon: '±' },
]

export default function SetupWizard({ initialSettings, onComplete, onExit, onPracticeWeak }) {
  const [operation, setOperation] = useState(initialSettings?.operation ?? OPERATIONS.DEGREES_TO_FRACTION)

  const canStart = Boolean(operation)
  const previewSettings = { operation }

  function start() {
    if (!canStart) return
    onComplete({ operation })
  }

  return (
    <div className="wizard-stack">
      <div className="wizard setup-compact">
        <div className="wizard-topbar">
          <button className="icon-back-btn" onClick={onExit} aria-label="לתפריט הראשי">
            →
          </button>
        </div>

        <h2>בחר/י תרגול חלקי מעגל</h2>

        <div className="setup-section">
          <div className="setup-section-title">איזה תרגול תרצה?</div>
          <div className="operation-row">
            {OPERATION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`operation-cube ${operation === opt.value ? 'selected' : ''}`}
                onClick={() => setOperation(opt.value)}
              >
                <span className="option-icon">{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {canStart && <p className="summary-line">{describeSettings(previewSettings)}</p>}

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
