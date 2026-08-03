import { useEffect } from 'react'

export default function TemplateResults({ total, mistakeCount, elapsedMs, onPracticeAgain, onManage, onExit }) {
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

      <h2>סיימת את הטמפלייט!</h2>
      <p className="summary-line">{total} משפטים הוקלדו נכון ברצף מלא</p>

      <div className="score-circle">
        <div className="score-number">{mistakeCount === 0 ? '✔' : mistakeCount}</div>
        <div className="score-sub">{mistakeCount === 0 ? 'ללא אף קטיעה' : 'פעמים שהרצף נקטע'}</div>
      </div>

      <p className="time-line">זמן: {seconds} שניות</p>

      <div className="results-actions">
        <button className="primary-btn" onClick={onPracticeAgain}>
          נסה שוב
        </button>
        <button className="secondary-btn" onClick={onManage}>
          ניהול משפטים
        </button>
      </div>
    </div>
  )
}
