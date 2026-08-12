import ProgressMap from './ProgressMap'

export default function SetupWizard({ onStart }) {
  return (
    <div className="wizard-stack">
      <div className="wizard setup-compact">
        <h2>חלוקה</h2>
        <p className="summary-line">יוצג מספר, וצריך/ה לסמן באילו מהספרות הבאות הוא מתחלק</p>

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
