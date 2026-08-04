import { PRIMES } from './logic'
import { getPrimeLevel } from './stats'

export default function SetupWizard({ onStart }) {
  return (
    <div className="wizard setup-compact">
      <h2>מספרים ראשוניים</h2>
      <p className="summary-line">
        כתוב/כתבי את כל המספרים הראשוניים לפי הסדר, אחד אחרי השני, בשרשרת רצופה מ־{PRIMES[0]} עד {PRIMES[PRIMES.length - 1]}
      </p>

      <div className="primes-grid">
        {PRIMES.map((n) => {
          const level = getPrimeLevel(n)
          return (
            <div key={n} className={`grid-cell level-${level}`} title={String(n)}>
              {n}
            </div>
          )
        })}
      </div>

      <div className="legend">
        <span className="legend-item">
          <i className="dot level-green" /> שולט/ת
        </span>
        <span className="legend-item">
          <i className="dot level-yellow" /> בתהליך
        </span>
        <span className="legend-item">
          <i className="dot level-red" /> לתרגול
        </span>
        <span className="legend-item">
          <i className="dot level-unseen" /> לא תורגל
        </span>
      </div>

      <button className="primary-btn big" onClick={onStart}>
        התחל תרגול
      </button>
    </div>
  )
}
