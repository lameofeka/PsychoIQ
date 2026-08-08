import { useMemo, useState } from 'react'
import { getWords } from './dictionary'
import { getArchivedWordIds, unarchiveWord } from './stats'

export default function ArchiveManager({ onBack }) {
  const [archivedIds, setArchivedIds] = useState(() => getArchivedWordIds())
  const words = useMemo(() => getWords(), [])
  const archivedWords = useMemo(() => words.filter((w) => archivedIds.has(w.id)), [words, archivedIds])

  function handleRestore(id) {
    unarchiveWord(id)
    setArchivedIds(getArchivedWordIds())
  }

  return (
    <div className="wizard dict-manager">
      <div className="wizard-topbar">
        <button className="icon-back-btn" onClick={onBack} aria-label="חזרה">
          →
        </button>
      </div>

      <h2>מילון ארכיון</h2>
      <p className="summary-line">
        {archivedWords.length === 0
          ? 'אין עדיין מילים בארכיון. לחיצה כפולה על מילה בתרגול, אחרי מענה עליה, מעבירה אותה לכאן.'
          : `${archivedWords.length} מילים בארכיון · מוחזקות מחוץ לתרגול`}
      </p>

      {archivedWords.length > 0 && (
        <div className="word-list">
          {archivedWords.map((w) => (
            <div key={w.id} className="word-row">
              <div className="word-row-main">
                <div className="word-row-word">{w.word}</div>
                <div className="word-row-def">{w.def}</div>
                {w.aas && <div className="word-row-aas">{w.aas}</div>}
              </div>
              <div className="word-row-actions">
                <button className="link-btn" onClick={() => handleRestore(w.id)}>
                  החזרה למילון
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
