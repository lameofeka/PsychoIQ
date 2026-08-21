import { Fragment } from 'react'
import { getSentences } from './storage'
import { getSentenceLevel, getWeakSentenceIds } from './stats'

// Fixed openers that start a new paragraph in the standard 5-part essay
// structure this template is built around (מבוא / טיעון א / טיעון ב / טיעון
// נגדי / סיכום). If the wording is edited enough to drop a match, that
// paragraph just merges into the previous one instead of breaking - so a
// reworded template degrades gracefully instead of losing a sentence.
const PARAGRAPH_BREAK_PREFIXES = ['בראש ובראשונה', 'נוסף על האמור לעיל', 'מנגד, קיימת הטענה', 'לסיכום']

const LEVEL_LABEL = { green: 'שולט/ת', yellow: 'בתהליך', red: 'לתרגול', unseen: 'לא תורגל' }

function startsNewParagraph(text) {
  return PARAGRAPH_BREAK_PREFIXES.some((p) => text.startsWith(p))
}

export default function TemplateProgressMap({ onBack, onEdit, onStartPractice, onPracticeWeak }) {
  const sentences = getSentences()
  const weakIds = new Set(getWeakSentenceIds(sentences.map((s) => s.id)))
  const weakSentences = sentences.filter((s) => weakIds.has(s.id))

  // The template is authored with a leading section title (e.g. "הקדמה")
  // and a closing sentence that wraps up the essay - neither takes a
  // fill-in blank, only the connector phrases in between do.
  const heading = sentences[0]
  const closing = sentences.length > 1 ? sentences[sentences.length - 1] : null
  const body = sentences.length > 1 ? sentences.slice(1, -1) : []

  const paragraphs = []
  for (const s of body) {
    if (paragraphs.length === 0 || startsNewParagraph(s.text)) paragraphs.push([])
    paragraphs[paragraphs.length - 1].push(s)
  }

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
        <div className="template-page">
          {heading && <div className="template-page-heading">{heading.text}</div>}

          {paragraphs.map((group, gi) => (
            <p className="template-page-para" key={gi}>
              {group.map((s) => {
                const level = getSentenceLevel(s.id)
                return (
                  <Fragment key={s.id}>
                    {s.text}
                    <span className={`template-blank level-${level}`} title={LEVEL_LABEL[level]} />
                    {'. '}
                  </Fragment>
                )
              })}
            </p>
          ))}

          {closing && <p className="template-page-para template-page-closing">{closing.text}</p>}
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
