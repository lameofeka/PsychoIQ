import { Fragment } from 'react'
import { MIN_BASE, MAX_BASE, MIN_EXPONENT, maxExponentForBase, getAllFactPairs } from './logic'
import { getFactLevel, getWeakFactPairs } from './stats'

const BASES = Array.from({ length: MAX_BASE - MIN_BASE + 1 }, (_, i) => MIN_BASE + i)
const MAX_EXPONENT = Math.max(...BASES.map(maxExponentForBase))
const EXPONENTS = Array.from({ length: MAX_EXPONENT - MIN_EXPONENT + 1 }, (_, i) => MIN_EXPONENT + i)

export default function ProgressMap({ onBack, onPracticeWeak }) {
  const weakPairs = getWeakFactPairs(getAllFactPairs())

  return (
    <div className="progress-map">
      {onBack && (
        <div className="wizard-topbar">
          <button className="icon-back-btn" onClick={onBack} aria-label="חזרה">
            →
          </button>
        </div>
      )}

      <h2>מפת התקדמות</h2>
      <p className="summary-line">כל תא בטבלה צבוע לפי רמת השליטה שלך באותה חזקה (בסיס × מעריך)</p>

      <div
        className="progress-grid"
        style={{ gridTemplateColumns: `repeat(${EXPONENTS.length + 1}, 1fr)` }}
      >
        <div className="grid-corner" />
        {EXPONENTS.map((exp) => (
          <div key={`col-${exp}`} className="grid-header">
            {exp}
          </div>
        ))}
        {BASES.map((base) => (
          <Fragment key={`row-${base}`}>
            <div className="grid-header">{base}</div>
            {EXPONENTS.map((exp) => {
              if (exp > maxExponentForBase(base)) {
                return <div key={`${base}-${exp}`} className="grid-cell blank" />
              }
              const level = getFactLevel(base, exp)
              return (
                <div
                  key={`${base}-${exp}`}
                  className={`grid-cell level-${level}`}
                  title={`${base}^${exp} = ${base ** exp}`}
                >
                  {base ** exp}
                </div>
              )
            })}
          </Fragment>
        ))}
      </div>

      <div className="legend">
        <span className="legend-item">
          <i className="dot level-green" /> שולט/ת
        </span>
        <span className="legend-item">
          <i className="dot level-yellow" /> בתהליך
        </span>
        <span className="legend-item">
          <i className="dot level-red" /> לתרגול
        </span>
        <span className="legend-item">
          <i className="dot level-unseen" /> לא תורגל
        </span>
      </div>

      <button className="secondary-btn" disabled={weakPairs.length === 0} onClick={() => onPracticeWeak(weakPairs)}>
        {weakPairs.length === 0 ? 'מושלם' : `תרגול חולשות (${weakPairs.length})`}
      </button>
    </div>
  )
}
