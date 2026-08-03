import { useEffect } from 'react'

export default function Results({ answers, elapsedMs, onPlayAgain, onNextGroup, onMistakesOnly, onNewGroups }) {
  const correctCount = answers.filter((a) => a.isCorrect).length
  const total = answers.length
  const percent = Math.round((correctCount / total) * 100)
  const seconds = Math.round(elapsedMs / 1000)
  const mistakes = answers.filter((a) => !a.isCorrect)

  useEffect(() => {
    function onKeyDown(e) {
      if (e.target.closest('button')) return
      if (e.key === 'Enter') {
        e.preventDefault()
        onPlayAgain()
      } else if (e.key === 'Tab' && onNextGroup) {
        e.preventDefault()
        onNextGroup()
      } else if (e.key === 'Backspace' && mistakes.length > 0) {
        e.preventDefault()
        onMistakesOnly()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  })

  return (
    <div className="results">
      <div className="wizard-topbar">
        <button className="icon-back-btn" onClick={onNewGroups} aria-label="בחירת קבוצה">
          →
        </button>
      </div>

      <h2>סיימת את התרגול!</h2>
      <p className="summary-line">{total} מילים תורגלו</p>

      <div className="score-circle">
        <div className="score-number">{percent}%</div>
        <div className="score-sub">
          {correctCount} מתוך {total} ידועות
        </div>
      </div>

      <p className="time-line">זמן: {seconds} שניות</p>

      <div className="results-actions">
        <button className="primary-btn" onClick={onPlayAgain}>
          נסה שוב
        </button>
        {onNextGroup && (
          <button className="secondary-btn" onClick={onNextGroup}>
            לקבוצה הבאה
          </button>
        )}
        {mistakes.length > 0 && (
          <button className="secondary-btn" onClick={onMistakesOnly}>
            רק טעויות
          </button>
        )}
      </div>
    </div>
  )
}
