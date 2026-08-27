import { useState } from 'react'
import { QUESTION_KINDS, ROOT_GROUPS } from './logic'
import ProgressMap from './ProgressMap'

const KIND_OPTIONS = [
  { value: QUESTION_KINDS.MEANING, label: 'משמעות', icon: 'א' },
  { value: QUESTION_KINDS.WORD, label: 'מילה', icon: 'W' },
  { value: QUESTION_KINDS.COMBINED, label: 'משולב', icon: '±' },
]

const ALL_GROUPS = 'all'

export default function SetupWizard({ initialKind, initialGroup, onComplete, onPracticeWeak }) {
  const [kind, setKind] = useState(initialKind ?? QUESTION_KINDS.MEANING)
  const [group, setGroup] = useState(initialGroup ?? ALL_GROUPS)

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

        <div className="setup-section">
          <div className="setup-section-title">איזו קבוצת שורשים לתרגל?</div>
          <div className="operation-row roots-group-row">
            {ROOT_GROUPS.map((g) => (
              <button
                key={g.key}
                className={`operation-cube roots-group-cube roots-group-cube--${g.key} ${group === g.key ? 'selected' : ''}`}
                onClick={() => setGroup(g.key)}
              >
                <span>{g.label}</span>
              </button>
            ))}
          </div>
          <button
            className={`integers-combined-btn ${group === ALL_GROUPS ? 'selected' : ''}`}
            onClick={() => setGroup(ALL_GROUPS)}
          >
            כל הקבוצות
          </button>
        </div>

        <button className="primary-btn big" onClick={() => onComplete(kind, group)}>
          התחל תרגול
        </button>
      </div>

      <div className="wizard setup-compact">
        <ProgressMap onPracticeWeak={onPracticeWeak} />
      </div>
    </div>
  )
}
