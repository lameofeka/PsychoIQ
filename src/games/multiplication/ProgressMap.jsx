import { Fragment } from 'react'
import { MIN_NUM, MAX_NUM } from './logic'
import { getFactLevel, getWeakFactPairs } from './stats'

const NUMBERS = Array.from({ length: MAX_NUM - MIN_NUM + 1 }, (_, i) => MIN_NUM + i)

export default function ProgressMap({ onBack, onPracticeWeak }) {
  const weakPairs = getWeakFactPairs()

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
      <p className="summary-line">כל תא בלוח הכפל צבוע לפי רמת השליטה שלך באותה כפולה</p>

      <div
        className="progress-grid"
        style={{ gridTemplateColumns: `repeat(${NUMBERS.length + 1}, 1fr)` }}
      >
        <div className="grid-corner" />
        {NUMBERS.map((n) => (
          <div key={`col-${n}`} className="grid-header">
            {n}
          </div>
        ))}
        {NUMBERS.map((row) => (
          <Fragment key={`row-${row}`}>
            <div className="grid-header">{row}</div>
            {NUMBERS.map((col) => {
              const level = getFactLevel(row, col)
              return (
                <div
                  key={`${row}-${col}`}
                  className={`grid-cell level-${level}`}
                  title={`${row} × ${col} = ${row * col}`}
                >
                  {row * col}
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
        {weakPairs.length === 0 ? 'שלטת בהכל!' : `תרגל/י את החולשות שלי (${weakPairs.length})`}
      </button>
    </div>
  )
}
