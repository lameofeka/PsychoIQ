import { useState } from 'react'
import ProgressMap from './ProgressMap'

export default function SetupWizard({ onComplete, onPracticeWeak, headerExtra }) {
  const [inOrder, setInOrder] = useState(false)

  return (
    <div className="wizard-stack">
      <div className="wizard setup-compact">
        {headerExtra}
        <h2>שלשות פיתגורס</h2>
        <p className="summary-line">
          בכל שאלה מוצג מספר אחד מתוך השלשה - השלימו את שני המספרים האחרים לפי הסדר
        </p>

        <div className="in-order-row">
          <span className="in-order-label">לפי הסדר</span>
          <button
            type="button"
            role="switch"
            aria-checked={inOrder}
            className={`toggle-switch ${inOrder ? 'checked' : ''}`}
            onClick={() => setInOrder((v) => !v)}
            title="מצב שרשרת"
          >
            <span className="toggle-knob" />
          </button>
        </div>

        <button className="primary-btn big" onClick={() => onComplete({ inOrder })}>
          התחל תרגול
        </button>
      </div>

      <div className="wizard setup-compact">
        <ProgressMap onPracticeWeak={onPracticeWeak} />
      </div>
    </div>
  )
}
