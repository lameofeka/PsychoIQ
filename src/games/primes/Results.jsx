import { useEffect } from 'react'
import { PRIMES } from './logic'

export default function Results({ correctCount, elapsedMs, onPlayAgain, onNewSettings }) {
  const total = PRIMES.length
  const percent = Math.round((correctCount / total) * 100)
  const seconds = Math.round(elapsedMs / 1000)

  useEffect(() => {
    function onKeyDown(e) {
      if (e.target.closest('button')) return
      if (e.key === 'Enter') {
        e.preventDefault()
        onPlayAgain()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  })

  return (
    <div className="results">
      <div className="wizard-topbar">
        <button className="icon-back-btn" onClick={onNewSettings} aria-label="חזרה">
          →
        </button>
      </div>

      <h2>סיימת את השרשרת!</h2>
      <p className="summary-line">
        כל {total} המספרים הראשוניים מ־{PRIMES[0]} עד {PRIMES[total - 1]}
      </p>

      <div className="score-circle">
        <div className="score-number">{percent}%</div>
        <div className="score-sub">
          {correctCount} מתוך {total} בניסיון ראשון
        </div>
      </div>

      <p className="time-line">זמן: {seconds} שניות</p>

      <div className="results-actions">
        <button className="primary-btn" onClick={onPlayAgain}>
          שחק/י שוב
        </button>
      </div>
    </div>
  )
}
