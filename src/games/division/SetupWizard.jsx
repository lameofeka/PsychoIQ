import ProgressMap from './ProgressMap'
import { getBestStreak } from './stats'

export default function SetupWizard({ onStart, headerExtra }) {
  const bestStreak = getBestStreak()

  return (
    <div className="wizard-stack">
      <div className="wizard setup-compact">
        {headerExtra}
        <h2>שיא אישי: {bestStreak}</h2>
        <p className="summary-line">יוצג מספר, וצריך/ה לסמן באילו מהספרות הבאות הוא מתחלק - ברצף, בלי סוף</p>

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
