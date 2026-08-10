import { POLYGON_FACTS } from './logic'
import { getFactLevel, getWeakNumbers } from './stats'

const SIDES_LIST = POLYGON_FACTS.map((fact) => fact.sides)

export default function ProgressMap({ onPracticeWeak }) {
  const weakSides = getWeakNumbers(SIDES_LIST)
  const weakFacts = POLYGON_FACTS.filter((fact) => weakSides.includes(fact.sides))

  return (
    <div className="progress-map">
      <h2>מפת התקדמות</h2>
      <p className="summary-line">כל תא צבוע לפי רמת השליטה שלך בצורה הזו</p>

      <div
        className="progress-grid polygon-progress-grid"
        style={{ gridTemplateColumns: `repeat(${POLYGON_FACTS.length}, 1fr)` }}
      >
        {POLYGON_FACTS.map((fact) => (
          <div key={`h-${fact.sides}`} className="grid-header">
            {fact.name}
          </div>
        ))}
        {POLYGON_FACTS.map((fact) => {
          const level = getFactLevel(fact.sides)
          return (
            <div
              key={fact.sides}
              className={`grid-cell level-${level}`}
              title={`${fact.name}: סכום ${fact.sum}°, זווית ${fact.angle}°, זווית מרכזית ${fact.central}°`}
            >
              <span className="grid-cell-value">{fact.sum}°</span>
              <span className="grid-cell-value">{fact.angle}°</span>
              <span className="grid-cell-value">{fact.central}°</span>
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

      <button className="secondary-btn" disabled={weakFacts.length === 0} onClick={() => onPracticeWeak(weakFacts)}>
        {weakFacts.length === 0 ? 'מושלם' : `תרגול חולשות (${weakFacts.length})`}
      </button>
    </div>
  )
}
