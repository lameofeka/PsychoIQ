import ProgressMap from './ProgressMap'

export default function SetupWizard({ onComplete, onPracticeWeak }) {
  return (
    <div className="wizard-stack">
      <div className="wizard setup-compact">
        <h2>מצולעים משוכללים</h2>
        <p className="summary-line">
          בכל שאלה תוצג צורה - הזינו את סכום הזוויות, זווית אחת והזווית המרכזית שלה
        </p>

        <button className="primary-btn big" onClick={() => onComplete({})}>
          התחל תרגול
        </button>
      </div>

      <div className="wizard setup-compact">
        <ProgressMap onPracticeWeak={onPracticeWeak} />
      </div>
    </div>
  )
}
