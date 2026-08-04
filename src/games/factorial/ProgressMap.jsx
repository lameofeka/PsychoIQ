import { Fragment } from 'react'
import { getAllFacts, factorial } from './logic'
import { getFactLevel, getWeakNumbers } from './stats'

const NUMBERS = getAllFacts()

export default function ProgressMap({ onBack, onPracticeWeak }) {
  const weakNumbers = getWeakNumbers(NUMBERS)

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
      <p className="summary-line">כל תא צבוע לפי רמת השליטה שלך בעצרת של אותו מספר</p>

      <div className="progress-grid" style={{ gridTemplateColumns: `repeat(${NUMBERS.length}, 1fr)` }}>
        {NUMBERS.map((n) => (
          <Fragment key={n}>
            <div className="grid-header">{n}!</div>
          </Fragment>
        ))}
        {NUMBERS.map((n) => {
          const level = getFactLevel(n)
          return (
            <div key={n} className={`grid-cell level-${level}`} title={`${n}! = ${factorial(n)}`}>
              {factorial(n)}
            </div>
          )
        })}
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

      <button className="secondary-btn" disabled={weakNumbers.length === 0} onClick={() => onPracticeWeak(weakNumbers)}>
        {weakNumbers.length === 0 ? 'שלטת בהכל!' : `תרגל/י את החולשות שלי (${weakNumbers.length})`}
      </button>
    </div>
  )
}
