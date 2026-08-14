import { getSentences } from './storage'
import { getSentenceLevel, getWeakSentenceIds } from './stats'

export default function TemplateProgressMap({ onBack, onEdit, onStartPractice, onPracticeWeak }) {
  const sentences = getSentences()
  const weakIds = new Set(getWeakSentenceIds(sentences.map((s) => s.id)))
  const weakSentences = sentences.filter((s) => weakIds.has(s.id))

  return (
    <div className="wizard progress-map">
      <div className="wizard-topbar">
        <button className="icon-back-btn" onClick={onBack} aria-label="לתפריט חיבור">
          →
        </button>
      </div>

      <h2>מפת התקדמות - טמפלייט</h2>
      <p className="summary-line">{sentences.length} משפטים בטמפלייט</p>

      {sentences.length === 0 ? (
        <p className="summary-line">הטמפלייט ריק. לחצו על עריכה כדי להוסיף משפט ראשון.</p>
      ) : (
        <div className="mistakes-list-wrap">
          <ul className="mistakes-list">
            {sentences.map((s, i) => {
              const level = getSentenceLevel(s.id)
              return (
                <li key={s.id} className="mistakes-row" title={s.text}>
                  <span className="mistakes-row-rank">{i + 1}</span>
                  <span className={`dot level-${level}`} />
                  <span className="mistakes-row-word">{s.text}</span>
                </li>
              )
            })}
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
        <button className="secondary-btn" disabled={weakSentences.length === 0} onClick={() => onPracticeWeak(weakSentences)}>
          {weakSentences.length === 0 ? 'מושלם' : `תרגול חולשות (${weakSentences.length})`}
        </button>
        <button className="primary-btn big" disabled={sentences.length === 0} onClick={onStartPractice}>
          התחל תרגול
        </button>
      </div>

      <button type="button" className="link-btn" style={{ display: 'block', marginTop: 16, textAlign: 'center' }} onClick={onEdit}>
        עריכת משפטים
      </button>
    </div>
  )
}
