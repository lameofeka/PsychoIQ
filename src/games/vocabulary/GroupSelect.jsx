import { useMemo, useState } from 'react'
import { getWords, getGroups } from './dictionary'
import { getGroupLevel, getLastPracticedGroup, rankWeakWords } from './stats'
import ModeSwitch from './ModeSwitch'

function ShuffleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h3.5c1.5 0 2.5.7 3.5 2l6 8c1 1.3 2 2 3.5 2H21" />
      <path d="M17.5 4.5 21 6l-3.5 1.5" />
      <path d="M3 18h3.5c1.5 0 2.5-.7 3.5-2l.7-1" />
      <path d="M13.5 8l.7-1c1-1.3 2-2 3.5-2H21" />
      <path d="M17.5 19.5 21 18l-3.5-1.5" />
    </svg>
  )
}

export default function GroupSelect({ onManageDictionary, onStart, onOpenMistakes }) {
  const words = useMemo(() => getWords(), [])
  const groups = useMemo(() => getGroups(words), [words])
  const lastGroupIndex = useMemo(() => getLastPracticedGroup(), [])
  const [selected, setSelected] = useState(new Set())

  const allWordsWithGroup = useMemo(
    () => groups.flatMap((g) => g.words.map((w) => ({ ...w, groupIndex: g.index }))),
    [groups],
  )
  const weakWords = useMemo(() => rankWeakWords(allWordsWithGroup), [allWordsWithGroup])

  function toggleGroup(index) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  function startAll() {
    onStart(allWordsWithGroup)
  }

  function clearAll() {
    setSelected(new Set())
  }

  const selectedWords = groups
    .filter((g) => selected.has(g.index))
    .flatMap((g) => g.words.map((w) => ({ ...w, groupIndex: g.index })))

  return (
    <div className="wizard group-select">
      <div className="wizard-topbar">
        <ModeSwitch mode="practice" onChange={(m) => m === 'dictionary' && onManageDictionary()} />
      </div>

      {groups.length === 0 ? (
        <>
          <p className="summary-line">המילון ריק. הוסיפו מילים כדי להתחיל לתרגל.</p>
          <button className="primary-btn" onClick={onManageDictionary}>
            הוספת מילים למילון
          </button>
        </>
      ) : (
        <>
          <div className="group-actions">
            <button className="practice-all-btn" onClick={startAll}>
              <ShuffleIcon />
              תרגל הכל
            </button>
            <button className="link-btn" onClick={clearAll}>
              נקה בחירה
            </button>
          </div>

          <div className="group-grid">
            {groups.map((g) => (
              <button
                key={g.index}
                className={`group-chip level-${getGroupLevel(g.index)} ${selected.has(g.index) ? 'selected' : ''}`}
                onClick={() => toggleGroup(g.index)}
              >
                {g.index === lastGroupIndex && (
                  <span className="group-chip-last-dot" title="תורגל לאחרונה" aria-label="תורגל לאחרונה" />
                )}
                <span className="group-chip-title">{g.index}</span>
              </button>
            ))}
          </div>

          <div className="legend">
            <span className="legend-item">
              <i className="dot level-green" /> שולט/ת
            </span>
            <span className="legend-item">
              <i className="dot level-yellow" /> כמעט
            </span>
            <span className="legend-item">
              <i className="dot level-red" /> לתרגול
            </span>
            <span className="legend-item">
              <i className="dot level-unseen" /> לא תורגל
            </span>
          </div>

          <div className="practice-actions">
            <button className="primary-btn big" disabled={selectedWords.length === 0} onClick={() => onStart(selectedWords)}>
              תרגל
            </button>

            <button className="secondary-btn" disabled={weakWords.length === 0} onClick={onOpenMistakes}>
              תרגל טעויות
            </button>
          </div>
        </>
      )}
    </div>
  )
}
