import { useState } from 'react'
import { OPERATIONS, RANGE_TYPES, MIN_NUM, MAX_NUM, describeSettings } from './logic'
import ProgressMap from './ProgressMap'

const OPERATION_OPTIONS = [
  { value: OPERATIONS.MULTIPLY, label: 'כפל', icon: '×' },
  { value: OPERATIONS.DIVIDE, label: 'חילוק', icon: '÷' },
  { value: OPERATIONS.COMBINED, label: 'משולב', icon: '±' },
]

const PICK_LABEL = 'מספר או טווח'
const SELECT_ALL_LABEL = 'בחר הכל'

const NUMBERS = Array.from({ length: MAX_NUM - MIN_NUM + 1 }, (_, i) => MIN_NUM + i)

export default function SetupWizard({ initialSettings, onComplete, onExit, onPracticeWeak }) {
  const [operation, setOperation] = useState(initialSettings?.operation ?? OPERATIONS.MULTIPLY)
  const initialRangeType =
    initialSettings?.rangeType === RANGE_TYPES.WEAK ? RANGE_TYPES.ALL : initialSettings?.rangeType
  const [rangeType, setRangeType] = useState(initialRangeType ?? RANGE_TYPES.ALL)
  const [singleNumber, setSingleNumber] = useState(initialSettings?.singleNumber ?? 7)
  const [rangeStart, setRangeStart] = useState(initialSettings?.rangeStart ?? 3)
  const [rangeEnd, setRangeEnd] = useState(initialSettings?.rangeEnd ?? 6)
  const [rangeAnchor, setRangeAnchor] = useState(null)

  const canStart = Boolean(operation && rangeType)
  const previewSettings = { operation, rangeType, singleNumber, rangeStart, rangeEnd }

  function start() {
    if (!canStart) return
    onComplete({ operation, rangeType, singleNumber, rangeStart, rangeEnd })
  }

  // One click picks a single number; a second click on a different number
  // turns the selection into the range between the two clicks.
  function pickNumber(n) {
    if (rangeAnchor === null) {
      setRangeType(RANGE_TYPES.SINGLE)
      setSingleNumber(n)
      setRangeStart(n)
      setRangeEnd(n)
      setRangeAnchor(n)
    } else if (n !== rangeAnchor) {
      setRangeType(RANGE_TYPES.RANGE)
      setRangeStart(rangeAnchor)
      setRangeEnd(n)
      setRangeAnchor(null)
    }
  }

  function selectAll() {
    setRangeType((prev) => (prev === RANGE_TYPES.ALL ? null : RANGE_TYPES.ALL))
    setRangeAnchor(null)
  }

  const rangeLo = Math.min(rangeStart, rangeEnd)
  const rangeHi = Math.max(rangeStart, rangeEnd)
  const isNumberPicked = (n) =>
    rangeType === RANGE_TYPES.ALL ||
    (rangeType === RANGE_TYPES.SINGLE ? n === singleNumber : rangeType === RANGE_TYPES.RANGE && n >= rangeLo && n <= rangeHi)

  return (
    <div className="wizard-stack">
      <div className="wizard setup-compact">
        <div className="wizard-topbar">
          <button className="icon-back-btn" onClick={onExit} aria-label="לתפריט הראשי">
            →
          </button>
        </div>

        <h2>בחר/י תרגול</h2>

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

        <div className="setup-section">
          <div className="setup-section-title">על אילו מספרים לתרגל?</div>
          <div className="option-grid">
            <div className="option-card number-pick-card selected">
              <div className="option-radio-row">
                <span className="option-card-label">{PICK_LABEL}</span>
                <button type="button" className="select-all-btn" onClick={selectAll}>
                  {SELECT_ALL_LABEL}
                </button>
              </div>
              <div className="inline-number-picker">
                {NUMBERS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`number-chip ${isNumberPicked(n) ? 'selected' : ''}`}
                    onClick={() => pickNumber(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
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
