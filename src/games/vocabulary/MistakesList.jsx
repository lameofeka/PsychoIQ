import { useMemo, useState } from 'react'
import { getActiveWords, getGroups } from './dictionary'
import { nearbyShuffle, shuffle } from './logic'
import { lockMistake, rankWeakWords, unlockMistake } from './stats'

function tierFor(wrongRate) {
  if (wrongRate >= 0.8) return 1
  if (wrongRate >= 0.6) return 2
  if (wrongRate >= 0.4) return 3
  if (wrongRate >= 0.2) return 4
  return 5
}

export default function MistakesList({ onBack, onStartPractice }) {
  const words = useMemo(() => getActiveWords(), [])
  const groups = useMemo(() => getGroups(words), [words])
  const allWordsWithGroup = useMemo(
    () => groups.flatMap((g) => g.words.map((w) => ({ ...w, groupIndex: g.index }))),
    [groups],
  )
  const [lockVersion, setLockVersion] = useState(0)
  const [inOrder, setInOrder] = useState(true)
  const ranked = useMemo(() => rankWeakWords(allWordsWithGroup), [allWordsWithGroup, lockVersion])

  function toggleLock(wordId, locked) {
    if (locked) unlockMistake(wordId)
    else lockMistake(wordId)
    setLockVersion((v) => v + 1)
  }

  function handleStart() {
    const orderedWords = ranked.map((entry) => entry.word)
    onStartPractice(inOrder ? nearbyShuffle(orderedWords) : shuffle(orderedWords))
  }

  return (
    <div className="wizard">
      <div className="wizard-topbar">
        <button className="icon-back-btn" onClick={onBack} aria-label="חזרה">
          →
        </button>
      </div>

      <h2>תרגול טעויות</h2>

      {ranked.length === 0 ? (
        <p className="summary-line">אין כרגע מילים שטעית בהן.</p>
      ) : (
        <>
          <p className="summary-line">{ranked.length} מילים, מהטעות הכי נפוצה ועד הכי נדירה</p>

          <div className="mistakes-list-wrap">
            <ul className="mistakes-list">
              {ranked.map(({ word, wrongRate, locked }, i) => (
                <li
                  key={word.id}
                  className={`mistakes-row tier-${tierFor(wrongRate)}`}
                  onDoubleClick={() => toggleLock(word.id, locked)}
                  title={locked ? 'נעולה בתרגול טעויות - לחיצה כפולה לביטול הנעילה' : 'לחיצה כפולה תנעל את המילה בתרגול טעויות'}
                >
                  <span className="mistakes-row-rank">{i + 1}</span>
                  <span className="mistakes-row-word">{word.word}</span>
                  {locked && (
                    <button
                      type="button"
                      className="mistakes-row-lock"
                      onClick={() => toggleLock(word.id, locked)}
                      aria-label="בטל נעילה - המילה תוצא מתרגול טעויות אם התשובות עליה יהיו נכונות"
                    >
                      🔒
                    </button>
                  )}
                  <span className="mistakes-row-rate">{Math.round(wrongRate * 100)}%</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="in-order-row">
            <span className="in-order-label">לפי הסדר</span>
            <button
              type="button"
              role="switch"
              aria-checked={inOrder}
              className={`toggle-switch ${inOrder ? 'checked' : ''}`}
              onClick={() => setInOrder((v) => !v)}
              title="מיון לפי חומרת הטעות במקום אקראי לגמרי"
            >
              <span className="toggle-knob" />
            </button>
          </div>

          <button className="primary-btn big" onClick={handleStart}>
            התחל לתרגל טעויות
          </button>
        </>
      )}
    </div>
  )
}
