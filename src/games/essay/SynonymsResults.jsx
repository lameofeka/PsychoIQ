import { useEffect } from 'react'

export default function SynonymsResults({ totalWords, correctTotal, wrongTotal, elapsedMs, onPracticeAgain, onManage, onExit }) {
  const attempts = correctTotal + wrongTotal
  const percent = attempts === 0 ? 100 : Math.round((correctTotal / attempts) * 100)
  const seconds = Math.round(elapsedMs / 1000)

  useEffect(() => {
    function onKeyDown(e) {
      if (e.target.closest('button')) return
      if (e.key === 'Enter') {
        e.preventDefault()
        onPracticeAgain()
      } else if (e.key === 'Tab') {
        e.preventDefault()
        onManage()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  })

  return (
    <div className="results">
      <div className="wizard-topbar">
        <button className="icon-back-btn" onClick={onExit} aria-label="לתפריט חיבור">
          →
        </button>
      </div>

      <h2>סיימת את התרגול!</h2>
      <p className="summary-line">{totalWords} מילים תורגלו</p>

      <div className="score-circle">
        <div className="score-number">{percent}%</div>
        <div className="score-sub">
          {correctTotal} ניחושים נכונים, {wrongTotal} שגויים
        </div>
      </div>

      <p className="time-line">זמן: {seconds} שניות</p>

      <div className="results-actions">
        <button className="primary-btn" onClick={onPracticeAgain}>
          נסה שוב
        </button>
        <button className="secondary-btn" onClick={onManage}>
          ניהול מילים נרדפות
        </button>
      </div>
    </div>
  )
}
