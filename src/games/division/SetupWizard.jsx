import ProgressMap from './ProgressMap'
import { getBestStreak } from './stats'

export default function SetupWizard({ onStart }) {
  const bestStreak = getBestStreak()

  return (
    <div className="wizard-stack">
      <div className="wizard setup-compact">
        <h2>חלוקה</h2>
        <p className="summary-line">יוצג מספר, וצריך/ה לסמן באילו מהספרות הבאות הוא מתחלק - ברצף, בלי סוף</p>
        <p className="summary-line">השיא האישי שלך: רצף של {bestStreak} מספרים</p>

        <button className="primary-btn big" onClick={onStart}>
          התחל תרגול
        </button>
      </div>

      <div className="wizard setup-compact">
        <ProgressMap />
      </div>
    </div>
  )
}
