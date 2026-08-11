import { useState } from 'react'
import ProgressMap from './ProgressMap'

export default function SetupWizard({ onComplete, onPracticeWeak, onStartOctagonArea, headerExtra }) {
  const [inOrder, setInOrder] = useState(false)

  return (
    <div className="wizard-stack">
      <div className="wizard setup-compact">
        {headerExtra}
        <h2>מצולעים משוכללים</h2>
        <p className="summary-line">
          בכל שאלה תוצג צורה - הזינו את סכום הזוויות, זווית אחת והזווית המרכזית שלה
        </p>

        <div className="in-order-row">
          <span className="in-order-label">לפי הסדר</span>
          <button
            type="button"
            role="switch"
            aria-checked={inOrder}
            className={`toggle-switch geo-toggle-switch ${inOrder ? 'checked' : ''}`}
            onClick={() => setInOrder((v) => !v)}
            title="מצב שרשרת"
          >
            <span className="toggle-knob" />
          </button>
        </div>

        <button className="primary-btn big" onClick={() => onComplete({ inOrder })}>
          התחל תרגול
        </button>

        <button type="button" className="link-btn octagon-area-link" onClick={onStartOctagonArea}>
          תרגול מתומן
        </button>
      </div>

      <div className="wizard setup-compact">
        <ProgressMap onPracticeWeak={onPracticeWeak} />
      </div>
    </div>
  )
}
