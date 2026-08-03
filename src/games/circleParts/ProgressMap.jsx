import { Fragment } from 'react'
import { CIRCLE_FACTS } from './logic'
import { getFactLevel, getWeakNumbers } from './stats'

const DEGREES_LIST = CIRCLE_FACTS.map((fact) => fact.degrees)

export default function ProgressMap({ onBack, onPracticeWeak }) {
  const weakDegrees = getWeakNumbers(DEGREES_LIST)
  const weakFacts = CIRCLE_FACTS.filter((fact) => weakDegrees.includes(fact.degrees))

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
      <p className="summary-line">כל תא צבוע לפי רמת השליטה שלך בחלק המעגל הזה</p>

      <div className="progress-grid" style={{ gridTemplateColumns: `repeat(${CIRCLE_FACTS.length}, 1fr)` }}>
        {CIRCLE_FACTS.map((fact) => (
          <Fragment key={fact.degrees}>
            <div className="grid-header">{fact.degrees}°</div>
          </Fragment>
        ))}
        {CIRCLE_FACTS.map((fact) => {
          const level = getFactLevel(fact.degrees)
          return (
            <div
              key={fact.degrees}
              className={`grid-cell level-${level}`}
              title={`${fact.degrees}° = ${fact.numerator}/${fact.denominator}`}
            >
              {fact.numerator}/{fact.denominator}
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

      <button className="primary-btn" disabled={weakFacts.length === 0} onClick={() => onPracticeWeak(weakFacts)}>
        {weakFacts.length === 0 ? 'שלטת בהכל!' : `תרגל/י את החולשות שלי (${weakFacts.length})`}
      </button>
    </div>
  )
}
