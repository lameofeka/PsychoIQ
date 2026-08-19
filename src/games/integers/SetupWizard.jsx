import { useState } from 'react'
import { LAWS } from './logic'

const LAW_OPTIONS = [
  { value: LAWS.SIGN, label: 'סימנים', icon: '±' },
  { value: LAWS.PARITY, label: 'זוגי / אי-זוגי', icon: '≡' },
  { value: LAWS.FRACTION, label: 'חילוק ושברים', icon: '½' },
  { value: LAWS.PRODUCTS, label: 'מכפלות מיוחדות', icon: '∏' },
]

const LAW_DESCRIPTIONS = {
  [LAWS.SIGN]: 'כמה פלוס ומינוס יש בכפל או בחילוק? מספר זוגי של מינוסים - תוצאה חיובית, מספר אי-זוגי של מינוסים - תוצאה שלילית.',
  [LAWS.PARITY]: 'זוגי ואי-זוגי בחיבור, בחיסור ובכפל - השלימו את התוצאה או את המספר החסר.',
  [LAWS.FRACTION]: 'חילוק בין זוגיים ואי-זוגיים - מתי בטוח יוצא שבר, ומתי אפשר לצאת עם מספר שלם?',
  [LAWS.PRODUCTS]: 'מכפלות של מספרים עוקבים או מספרים זוגיים תמיד מתחלקות במספר קבוע.',
  [LAWS.COMBINED]: 'כל ארבעת החוקים מעורבבים יחד באותו תרגול.',
}

export default function SetupWizard({ initialSettings, onComplete, headerExtra }) {
  const [law, setLaw] = useState(initialSettings?.law && initialSettings.law !== 'weak' ? initialSettings.law : LAWS.SIGN)

  function start() {
    onComplete({ law })
  }

  return (
    <div className="wizard setup-compact">
      {headerExtra}
      <h2>שלמים</h2>

      <div className="setup-section">
        <div className="operation-row integers-law-row">
          {LAW_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`operation-cube ${law === opt.value ? 'selected' : ''}`}
              onClick={() => setLaw(opt.value)}
            >
              <span className="option-icon">{opt.icon}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          className={`integers-combined-btn ${law === LAWS.COMBINED ? 'selected' : ''}`}
          onClick={() => setLaw(LAWS.COMBINED)}
        >
          <span className="option-icon">∗</span>
          <span>מעורבב - כל הסוגים</span>
        </button>
      </div>

      <p className="summary-line">{LAW_DESCRIPTIONS[law]}</p>

      <button className="primary-btn big" onClick={start}>
        התחל תרגול
      </button>
    </div>
  )
}
