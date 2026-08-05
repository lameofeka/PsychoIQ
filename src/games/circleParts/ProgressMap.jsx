import { Fragment } from 'react'
import { CIRCLE_FACTS } from './logic'
import { getFactLevel, getWeakNumbers } from './stats'

const DEGREES_LIST = CIRCLE_FACTS.map((fact) => fact.degrees)
// Rendered left-to-right in ascending degree order, independent of
// CIRCLE_FACTS's own (unsorted) declaration order.
const SORTED_FACTS = [...CIRCLE_FACTS].sort((a, b) => a.degrees - b.degrees)

// Split into two rows instead of one long row of 11 columns, so each
// column — and the cell/text inside it — can render bigger while still
// fitting the compact setup card.
const ROW_COUNT = 2
const CHUNK_SIZE = Math.ceil(SORTED_FACTS.length / ROW_COUNT)
const FACT_ROWS = Array.from({ length: ROW_COUNT }, (_, i) =>
  SORTED_FACTS.slice(i * CHUNK_SIZE, i * CHUNK_SIZE + CHUNK_SIZE)
)

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

      <div
        className="progress-grid circle-progress-grid"
        style={{ gridTemplateColumns: `repeat(${CHUNK_SIZE}, 1fr)` }}
      >
        {FACT_ROWS.map((rowFacts, i) => {
          // Rows can come up short of CHUNK_SIZE (11 facts don't split evenly
          // into 2 rows of 6) — pad with blanks so every row still contributes
          // exactly CHUNK_SIZE headers + CHUNK_SIZE cells. Otherwise the grid's
          // auto-placement doesn't know where the intended row break is and
          // bleeds the last row's cells into the wrong columns.
          const padCount = CHUNK_SIZE - rowFacts.length
          const pads = Array.from({ length: padCount }, (_, p) => p)
          return (
            <Fragment key={`row-${i}`}>
              {rowFacts.map((fact) => (
                <div key={`h-${fact.degrees}`} className="grid-header">
                  {fact.degrees}°
                </div>
              ))}
              {pads.map((p) => (
                <div key={`h-pad-${i}-${p}`} className="grid-header" />
              ))}
              {rowFacts.map((fact) => {
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
              {pads.map((p) => (
                <div key={`c-pad-${i}-${p}`} className="grid-cell blank" />
              ))}
            </Fragment>
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

      <button className="secondary-btn" disabled={weakFacts.length === 0} onClick={() => onPracticeWeak(weakFacts)}>
        {weakFacts.length === 0 ? 'מושלם' : `תרגול חולשות (${weakFacts.length})`}
      </button>
    </div>
  )
}
