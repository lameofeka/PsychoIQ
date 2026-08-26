import { useState } from 'react'
import { QUESTION_KINDS } from './logic'
import ProgressMap from './ProgressMap'

const KIND_OPTIONS = [
  { value: QUESTION_KINDS.MEANING, label: 'משמעות', icon: 'א' },
  { value: QUESTION_KINDS.WORD, label: 'מילה', icon: 'W' },
  { value: QUESTION_KINDS.COMBINED, label: 'משולב', icon: '±' },
]

export default function SetupWizard({ initialKind, onComplete, onPracticeWeak }) {
  const [kind, setKind] = useState(initialKind ?? QUESTION_KINDS.MEANING)

  return (
    <div className="wizard-stack">
      <div className="wizard setup-compact">
        <div className="setup-section">
          <div className="operation-row">
            {KIND_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`operation-cube ${kind === opt.value ? 'selected' : ''}`}
                onClick={() => setKind(opt.value)}
              >
                <span className="option-icon">{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        <button className="primary-btn big" onClick={() => onComplete(kind)}>
          התחל תרגול
        </button>
      </div>

      <div className="wizard setup-compact">
        <ProgressMap onPracticeWeak={onPracticeWeak} />
      </div>
    </div>
  )
}
