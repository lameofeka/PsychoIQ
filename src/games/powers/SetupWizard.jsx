import { useState } from 'react'
import { OPERATIONS, RANGE_TYPES, MIN_BASE, MAX_BASE, describeSettings } from './logic'
import ProgressMap from './ProgressMap'

const OPERATION_OPTIONS = [
  { value: OPERATIONS.POWER, label: 'חזקות', icon: 'xⁿ' },
  { value: OPERATIONS.ROOT, label: 'שורשים', icon: '√' },
  { value: OPERATIONS.COMBINED, label: 'משולב', icon: '±' },
]

const PICK_LABEL = 'בסיס או טווח'
const SELECT_ALL_LABEL = 'בחר הכל'

const BASES = Array.from({ length: MAX_BASE - MIN_BASE + 1 }, (_, i) => MIN_BASE + i)

export default function SetupWizard({ initialSettings, onComplete, onPracticeWeak }) {
  const [operation, setOperation] = useState(initialSettings?.operation ?? OPERATIONS.POWER)
  const initialRangeType =
    initialSettings?.rangeType === RANGE_TYPES.WEAK ? RANGE_TYPES.ALL : initialSettings?.rangeType
  const [rangeType, setRangeType] = useState(initialRangeType ?? RANGE_TYPES.ALL)
  const [singleBase, setSingleBase] = useState(initialSettings?.singleBase ?? 2)
  const [rangeStart, setRangeStart] = useState(initialSettings?.rangeStart ?? 2)
  const [rangeEnd, setRangeEnd] = useState(initialSettings?.rangeEnd ?? 5)
  const [rangeAnchor, setRangeAnchor] = useState(null)
  const [inOrder, setInOrder] = useState(initialSettings?.inOrder ?? false)

  const canStart = Boolean(operation && rangeType)
  const previewSettings = { operation, rangeType, singleBase, rangeStart, rangeEnd }

  function start() {
    if (!canStart) return
    onComplete({ operation, rangeType, singleBase, rangeStart, rangeEnd, inOrder })
  }

  // One click picks a single base; a second click on a different base turns
  // the selection into the range between the two clicks.
  function pickBase(n) {
    if (rangeAnchor === null) {
      setRangeType(RANGE_TYPES.SINGLE)
      setSingleBase(n)
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
  const isBasePicked = (n) =>
    rangeType === RANGE_TYPES.ALL ||
    (rangeType === RANGE_TYPES.SINGLE ? n === singleBase : rangeType === RANGE_TYPES.RANGE && n >= rangeLo && n <= rangeHi)

  return (
    <div className="wizard-stack">
      <div className="wizard setup-compact">
        <div className="setup-section">
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
          <div className="setup-section-title-row">
            <button
              type="button"
              className="in-order-toggle"
              onClick={() => setInOrder((v) => !v)}
              title="מצב שרשרת"
            >
              <span className={`checkbox-dot ${inOrder ? 'checked' : ''}`}>{inOrder ? '✓' : ''}</span>
              <span>לפי הסדר</span>
            </button>
          </div>
          <div className="option-grid">
            <div className="option-card number-pick-card selected">
              <div className="option-radio-row">
                <span className="option-card-label">{PICK_LABEL}</span>
                <button type="button" className="select-all-btn" onClick={selectAll}>
                  {SELECT_ALL_LABEL}
                </button>
              </div>
              <div className="inline-number-picker">
                {BASES.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`number-chip ${isBasePicked(n) ? 'selected' : ''}`}
                    onClick={() => pickBase(n)}
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
