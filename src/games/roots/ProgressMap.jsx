import { ROOTS, ROOT_GROUPS, questionFromKey } from './logic'
import { getFactLevel, getWeakKeys, meaningKey, wordKey } from './stats'
import { exampleFor } from './overrides'

export default function ProgressMap({ onBack, onPracticeWeak }) {
  // A root counts as weak if either its meaning or one of its words isn't
  // mastered yet - the two are tracked (and colored) independently, so
  // either one alone flags the root for practice.
  const weakKeys = getWeakKeys(ROOTS.flatMap((r) => [meaningKey(r.id), wordKey(r.id)]))

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
      <p className="summary-line">כל תא צבוע לפי רמת השליטה שלך בפירוש ובמילה של אותו שורש, בנפרד</p>

      {ROOT_GROUPS.map((group) => {
        const roots = ROOTS.filter((r) => r.group === group.key)
        if (roots.length === 0) return null
        return (
          <div key={group.key} className={`roots-group roots-group--${group.key}`}>
            <h3 className="roots-group-title">{group.label}</h3>
            <table className="roots-table">
              <thead>
                <tr>
                  <th>שורש</th>
                  <th>פירוש</th>
                  <th>מילה לדוגמה</th>
                </tr>
              </thead>
              <tbody>
                {roots.map((r) => {
                  const mLevel = getFactLevel(meaningKey(r.id))
                  const wLevel = getFactLevel(wordKey(r.id))
                  return (
                    <tr key={r.id}>
                      <td className="roots-table-root" dir="ltr">
                        {r.root}
                      </td>
                      <td className={`level-${mLevel}`}>{r.meaning}</td>
                      <td className={`level-${wLevel}`} dir="ltr">
                        {exampleFor(r)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      })}

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

      <button
        className="secondary-btn"
        disabled={weakKeys.length === 0}
        onClick={() => onPracticeWeak(weakKeys.map(questionFromKey))}
      >
        {weakKeys.length === 0 ? 'מושלם' : `תרגול חולשות (${weakKeys.length})`}
      </button>
    </div>
  )
}
