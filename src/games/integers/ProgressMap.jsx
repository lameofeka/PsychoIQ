import { LAWS, FRACTION_ROWS, PRODUCT_FACTS, formatFractionRule, formatProductFact } from './logic'
import { getLawLevel, getFractionRowLevel, getProductFactLevel } from './stats'

// Laws 1/2 have no fixed fact to color per-row (see stats.js), so each gets
// one summary block with its own level dot instead of a fact table - the
// full rule text as the user wrote it, spelled out line by line.
const LAW_RULES = [
  {
    law: LAWS.SIGN,
    title: 'סימנים בכפל ובחילוק',
    lines: [
      'סופרים כמה פעמים מופיע מינוס בין הגורמים/המחולקים:',
      'מספר זוגי של מינוסים ← התוצאה חיובית (+)',
      'מספר אי-זוגי של מינוסים ← התוצאה שלילית (-)',
      '(+)·(+) = (-)·(-) = (+)',
      '(+)·(-) = (-)·(+) = (-)',
      '(+)÷(-) = (-)÷(+) = (-)',
    ],
  },
  {
    law: LAWS.PARITY,
    title: 'זוגי ואי-זוגי',
    lines: [
      'בחיבור/חיסור סופרים כמה מהמספרים אי-זוגיים:',
      'מספר אי-זוגי של אי-זוגיים ← התוצאה אי-זוגית',
      'מספר זוגי של אי-זוגיים ← התוצאה זוגית',
      'זוגי ± זוגי = זוגי  ·  אי-זוגי ± אי-זוגי = זוגי  ·  זוגי ± אי-זוגי = אי-זוגי',
      'בכפל: אם גורם אחד זוגי - כל המכפלה זוגית',
      'זוגי × זוגי = זוגי  ·  אי-זוגי × אי-זוגי = אי-זוגי  ·  אי-זוגי × זוגי = זוגי',
    ],
  },
]

export default function ProgressMap({ onBack }) {
  return (
    <div className="progress-map">
      {onBack && (
        <div className="wizard-topbar">
          <button className="icon-back-btn" onClick={onBack} aria-label="חזרה">
            →
          </button>
        </div>
      )}

      <h2>שלמים - החוקים</h2>
      <p className="summary-line">כל שורה/חוק צבוע לפי רמת השליטה שלך בו</p>

      {LAW_RULES.map((block) => (
        <div key={block.law} className="integers-law-block">
          <div className="integers-law-block-header">
            <span>{block.title}</span>
            <i className={`dot level-${getLawLevel(block.law)}`} />
          </div>
          <ul className="integers-rule-list">
            {block.lines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      ))}

      <div className="integers-law-block">
        <div className="integers-law-block-header">
          <span>חילוק ושברים</span>
        </div>
        <div className="division-table-wrap">
          <table className="division-table integers-rule-table">
            <tbody>
              {FRACTION_ROWS.map((row, i) => (
                <tr key={i} className={`level-${getFractionRowLevel(i)}`}>
                  <td>{formatFractionRule(row)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="integers-law-block">
        <div className="integers-law-block-header">
          <span>מכפלות מיוחדות</span>
        </div>
        <div className="division-table-wrap">
          <table className="division-table integers-rule-table">
            <tbody>
              {PRODUCT_FACTS.map((fact, i) => (
                <tr key={i} className={`level-${getProductFactLevel(i)}`}>
                  <td>{formatProductFact(fact)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
    </div>
  )
}
