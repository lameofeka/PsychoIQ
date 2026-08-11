import { Fragment } from 'react'
import { CIRCLE_FACTS, percentForFact } from './logic'
import { getFactLevel, getWeakNumbers, fractionKey, percentKey } from './stats'
import { FractionText, PercentText } from './FractionText'

// Rendered left-to-right in ascending degree order, independent of
// CIRCLE_FACTS's own (unsorted) declaration order.
const SORTED_FACTS = [...CIRCLE_FACTS].sort((a, b) => a.degrees - b.degrees)

export default function ProgressMap({ onBack, onPracticeWeak }) {
  // A fact counts as weak if either its fraction or its percent answer
  // isn't mastered yet - the two are tracked (and colored) independently,
  // so either one alone can flag the fact for practice.
  const weakFractionDegrees = getWeakNumbers(SORTED_FACTS.map((fact) => fractionKey(fact.degrees)))
  const weakPercentDegrees = getWeakNumbers(SORTED_FACTS.map((fact) => percentKey(fact.degrees)))
  const weakFacts = CIRCLE_FACTS.filter(
    (fact) => weakFractionDegrees.includes(fractionKey(fact.degrees)) || weakPercentDegrees.includes(percentKey(fact.degrees))
  )

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
      <p className="summary-line">כל תא צבוע לפי רמת השליטה שלך בשבר ובאחוז של חלק המעגל הזה, בנפרד</p>

      {/* One column per fact (header, fraction cell, percent cell), laid
          out left-to-right by ascending degrees and scrollable sideways
          instead of wrapping - with 20 facts a fixed row fits far more
          columns legibly than squeezing them all into the setup card's
          width. */}
      <div className="circle-progress-scroll">
        <div className="progress-grid circle-progress-grid">
          {SORTED_FACTS.map((fact) => {
            const fractionLevel = getFactLevel(fractionKey(fact.degrees))
            const percentLevel = getFactLevel(percentKey(fact.degrees))
            const percent = percentForFact(fact)
            return (
              <Fragment key={fact.degrees}>
                <div className="grid-header">{fact.degrees}°</div>
                <div
                  className={`grid-cell circle-fraction-cell level-${fractionLevel}`}
                  title={`${fact.degrees}° = ${fact.numerator}/${fact.denominator}`}
                >
                  <FractionText numerator={fact.numerator} denominator={fact.denominator} />
                </div>
                <div
                  className={`grid-cell circle-percent-cell level-${percentLevel}`}
                  title={`${fact.numerator}/${fact.denominator} = ${percent.displayAnswer}`}
                >
                  <PercentText percent={percent} />
                </div>
              </Fragment>
            )
          })}
        </div>
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

      <button className="secondary-btn" disabled={weakFacts.length === 0} onClick={() => onPracticeWeak(weakFacts)}>
        {weakFacts.length === 0 ? 'מושלם' : `תרגול חולשות (${weakFacts.length})`}
      </button>
    </div>
  )
}
