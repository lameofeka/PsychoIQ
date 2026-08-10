import { POLYGON_FACTS } from './logic'
import { getFactLevel, getWeakNumbers } from './stats'

const SIDES_LIST = POLYGON_FACTS.map((fact) => fact.sides)

const ROWS = [
  { key: 'sum', label: 'סכום זוויות' },
  { key: 'angle', label: 'זווית אחת' },
  { key: 'central', label: 'זווית מרכזית' },
]

export default function ProgressMap({ onPracticeWeak }) {
  const weakSides = getWeakNumbers(SIDES_LIST)
  const weakFacts = POLYGON_FACTS.filter((fact) => weakSides.includes(fact.sides))

  return (
    <div className="progress-map">
      <h2>מפת התקדמות</h2>
      <p className="summary-line">כל עמודה צבועה לפי רמת השליטה שלך בצורה הזו</p>

      <div className="polygon-fact-table-wrap">
        <table className="polygon-fact-table">
          <thead>
            <tr>
              <th scope="col" />
              {POLYGON_FACTS.map((fact) => (
                <th key={fact.sides} scope="col">
                  {fact.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.key}>
                <th scope="row">{row.label}</th>
                {POLYGON_FACTS.map((fact) => {
                  const level = getFactLevel(fact.sides)
                  return (
                    <td key={fact.sides} className={`level-${level}`}>
                      {fact[row.key]}°
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
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
