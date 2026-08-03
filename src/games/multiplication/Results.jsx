import { useEffect } from 'react'
import { describeSettings } from './logic'

export default function Results({ settings, answers, elapsedMs, onPlayAgain, onNewSettings, onMistakesOnly }) {
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
        <button className="icon-back-btn" onClick={onNewSettings} aria-label="הגדרות חדשות">
          →
        </button>
      </div>

      <h2>סיימת את התרגול!</h2>
      <p className="summary-line">{describeSettings(settings)}</p>

      <div className="score-circle">
        <div className="score-number">{percent}%</div>
        <div className="score-sub">
          {correctCount} מתוך {total} נכונות
        </div>
      </div>

      <p className="time-line">זמן: {seconds} שניות</p>

      <div className="results-actions">
        <button className="primary-btn" onClick={onPlayAgain}>
          שחק/י שוב
        </button>
        {mistakes.length > 0 && (
          <button className="secondary-btn" onClick={onMistakesOnly}>
            תרגול רק טעויות
          </button>
        )}
      </div>
    </div>
  )
}
