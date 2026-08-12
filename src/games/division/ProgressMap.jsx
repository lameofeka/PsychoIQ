import { DIVISOR_RULES } from './logic'
import { getFactLevel } from './stats'

export default function ProgressMap({ onBack }) {
  return (
    <div className="progress-map">
      {onBack && (
        <div className="wizard-topbar">
          <button className="icon-back-btn" onClick={onBack} aria-label="חזרה">
            →
          </button>
        </div>
      )}

      <h2>סימני חלוקה</h2>
      <p className="summary-line">כל שורה צבועה לפי רמת השליטה שלך בסימן החלוקה הזה</p>

      <div className="division-table-wrap">
        <table className="division-table">
          <thead>
            <tr>
              <th scope="col">מתחלק ב-</th>
              <th scope="col">הסימן</th>
              <th scope="col">דוגמה</th>
            </tr>
          </thead>
          <tbody>
            {DIVISOR_RULES.map(({ n, rule, example }) => {
              const level = getFactLevel(n)
              return (
                <tr key={n} className={`level-${level}`}>
                  <td className="division-table-n">{n}</td>
                  <td className="division-table-rule">{rule}</td>
                  <td className="division-table-example">{example}</td>
                </tr>
              )
            })}
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
    </div>
  )
}
