import { getSynonymSets } from './storage'
import { getSynonymSetLevel } from './stats'

// Weakest first, so the words that most need practice sit at the top of the
// list instead of being buried among words already mastered.
const LEVEL_ORDER = { red: 0, yellow: 1, unseen: 2, green: 3 }

export default function SynonymsProgressMap({ onBack, onEdit, onStartPractice, onPracticeWeak }) {
  const sets = getSynonymSets()
  const practicable = sets.filter((s) => s.synonyms.length > 0)
  const rows = practicable
    .map((s) => ({ set: s, level: getSynonymSetLevel(s.id) }))
    .sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level])
  const weakSets = rows.filter((r) => r.level !== 'green').map((r) => r.set)

  return (
    <div className="wizard progress-map">
      <div className="wizard-topbar">
        <button className="icon-back-btn" onClick={onBack} aria-label="לתפריט חיבור">
          →
        </button>
      </div>

      <h2>מפת התקדמות - מילים נרדפות</h2>
      <p className="summary-line">
        {sets.length} מילים · {practicable.length} מוכנות לתרגול
      </p>

      {practicable.length === 0 ? (
        <p className="summary-line">אין עדיין מילים מוכנות לתרגול. לחצו על עריכה כדי להוסיף מילה נרדפת ראשונה.</p>
      ) : (
        <div className="mistakes-list-wrap">
          <ul className="mistakes-list">
            {rows.map(({ set, level }) => (
              <li key={set.id} className="mistakes-row" title={set.word}>
                <span className={`dot level-${level}`} />
                <span className="mistakes-row-word">{set.word}</span>
                <span className="mistakes-row-rate">{set.synonyms.length}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

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

      <div className="results-actions">
        <button className="secondary-btn" disabled={weakSets.length === 0} onClick={() => onPracticeWeak(weakSets)}>
          {weakSets.length === 0 ? 'מושלם' : `תרגול חולשות (${weakSets.length})`}
        </button>
        <button className="primary-btn big" disabled={practicable.length === 0} onClick={onStartPractice}>
          התחל תרגול
        </button>
      </div>

      <button type="button" className="link-btn" style={{ display: 'block', marginTop: 16, textAlign: 'center' }} onClick={onEdit}>
        עריכת מילים
      </button>
    </div>
  )
}
