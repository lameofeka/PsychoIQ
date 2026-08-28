import { useState } from 'react'
import { ROOT_GROUPS, questionFromKey } from './logic'
import { getFactLevel, getWeakKeys, meaningKey, wordKey } from './stats'
import { getRoots, updateRoot } from './dictionary'
import Modal from '../vocabulary/Modal'

const EMPTY_FORM = { root: '', meaning: '', example: '' }

export default function ProgressMap({ onBack, onPracticeWeak }) {
  // Local copy of the dictionary cache so an edit re-renders this table
  // immediately - same pattern as vocabulary's DictionaryManager.
  const [roots, setRoots] = useState(() => getRoots())

  // A root counts as weak if either its meaning or one of its words isn't
  // mastered yet - the two are tracked (and colored) independently, so
  // either one alone flags the root for practice.
  const weakKeys = getWeakKeys(roots.flatMap((r) => [meaningKey(r.id), wordKey(r.id)]))

  // The root being edited (or null when the popup is closed) - editForm
  // holds the text fields, seeded from it whenever a row is clicked.
  const [editingRoot, setEditingRoot] = useState(null)
  const [editForm, setEditForm] = useState(EMPTY_FORM)

  function openEdit(r) {
    setEditForm({ root: r.root, meaning: r.meaning, example: r.example })
    setEditingRoot(r)
  }

  function saveEdit() {
    setRoots(
      updateRoot(editingRoot.id, {
        root: editForm.root.trim() || editingRoot.root,
        meaning: editForm.meaning.trim() || editingRoot.meaning,
        example: editForm.example.trim() || editingRoot.example,
      }),
    )
    setEditingRoot(null)
  }

  return (
    <div className="progress-map">
      {onBack && (
        <div className="wizard-topbar">
          <button className="icon-back-btn" onClick={onBack} aria-label="חזרה">
            →
          </button>
        </div>
      )}

      <h2>מפת התקדמות</h2>
      <p className="summary-line">כל תא צבוע לפי רמת השליטה שלך בפירוש ובמילה של אותו שורש, בנפרד</p>

      {ROOT_GROUPS.map((group) => {
        const groupRoots = roots.filter((r) => r.group === group.key)
        if (groupRoots.length === 0) return null
        return (
          <div key={group.key} className={`roots-group roots-group--${group.key}`}>
            <h3 className="roots-group-title">{group.label}</h3>
            <table className="roots-table">
              <thead>
                <tr>
                  <th>שורש</th>
                  <th>פירוש</th>
                  <th>מילה לדוגמה</th>
                </tr>
              </thead>
              <tbody>
                {groupRoots.map((r) => {
                  const mLevel = getFactLevel(meaningKey(r.id))
                  const wLevel = getFactLevel(wordKey(r.id))
                  return (
                    <tr key={r.id} className="roots-table-row" onClick={() => openEdit(r)}>
                      <td className="roots-table-root" dir="ltr">
                        {r.root}
                      </td>
                      <td className={`level-${mLevel}`}>{r.meaning}</td>
                      <td className={`level-${wLevel}`} dir="ltr">
                        {r.example}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      })}

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

      <button
        className="secondary-btn"
        disabled={weakKeys.length === 0}
        onClick={() => onPracticeWeak(weakKeys.map(questionFromKey))}
      >
        {weakKeys.length === 0 ? 'מושלם' : `תרגול חולשות (${weakKeys.length})`}
      </button>

      {editingRoot && (
        <Modal title="עריכת שורש" onClose={() => setEditingRoot(null)}>
          <div className="vocab-edit-form">
            <input
              type="text"
              value={editForm.root}
              onChange={(e) => setEditForm((f) => ({ ...f, root: e.target.value }))}
              placeholder="שורש (למשל Bene-)"
              dir="ltr"
            />
            <input
              type="text"
              value={editForm.meaning}
              onChange={(e) => setEditForm((f) => ({ ...f, meaning: e.target.value }))}
              placeholder="פירוש"
            />
            <input
              type="text"
              value={editForm.example}
              onChange={(e) => setEditForm((f) => ({ ...f, example: e.target.value }))}
              placeholder="מילה לדוגמה"
              dir="ltr"
            />
            <div className="vocab-edit-form-actions">
              <button type="button" className="primary-btn" onClick={saveEdit}>
                שמירה
              </button>
              <button type="button" className="secondary-btn" onClick={() => setEditingRoot(null)}>
                ביטול
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
