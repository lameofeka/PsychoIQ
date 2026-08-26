import { Fragment } from 'react'
import { ROOTS, shortLabel, questionFromKey } from './logic'
import { getFactLevel, getWeakKeys, meaningKey, wordKey } from './stats'

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
      <p className="summary-line">כל שורש - תא עליון לפי שליטה בפירוש, תא תחתון לפי שליטה במילה</p>

      <div className="circle-progress-scroll">
        <div className="progress-grid circle-progress-grid">
          {ROOTS.map((r) => {
            const mLevel = getFactLevel(meaningKey(r.id))
            const wLevel = getFactLevel(wordKey(r.id))
            return (
              <Fragment key={r.id}>
                <div className="grid-header" title={r.root}>
                  {shortLabel(r)}
                </div>
                <div className={`grid-cell circle-fraction-cell level-${mLevel}`} title={`${r.root} · פירוש: ${r.meaning}`}>
                  {mLevel === 'green' ? '✓' : ''}
                </div>
                <div className={`grid-cell circle-percent-cell level-${wLevel}`} title={`${r.root} · מילה: ${r.words.join(' / ')}`}>
                  {wLevel === 'green' ? '✓' : ''}
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
