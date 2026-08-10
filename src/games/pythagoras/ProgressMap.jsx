import { TRIPLES, tripleId } from './logic'
import { getFactLevel, getWeakIds } from './stats'

const ALL_IDS = TRIPLES.map(tripleId)

export default function ProgressMap({ onPracticeWeak }) {
  const weakIds = getWeakIds(ALL_IDS)
  const weakTriples = TRIPLES.filter((t) => weakIds.includes(tripleId(t)))

  return (
    <div className="progress-map">
      <h2>מפת התקדמות</h2>
      <p className="summary-line">כל תא צבוע לפי רמת השליטה שלך בשלשה הזו</p>

      <div className="progress-grid pythagoras-progress-grid">
        {TRIPLES.map((triple) => {
          const id = tripleId(triple)
          const level = getFactLevel(id)
          return (
            <div key={id} className={`grid-cell level-${level}`} title={id}>
              {triple.join(' : ')}
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

      <button className="secondary-btn" disabled={weakTriples.length === 0} onClick={() => onPracticeWeak(weakTriples)}>
        {weakTriples.length === 0 ? 'מושלם' : `תרגול חולשות (${weakTriples.length})`}
      </button>
    </div>
  )
}
