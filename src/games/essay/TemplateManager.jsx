import { useState } from 'react'
import { getSentences, addSentence, updateSentence, deleteSentence, moveSentence } from './storage'
import ModeSwitch from './ModeSwitch'

const MODES = [
  { value: 'manage', label: 'ניהול משפטים' },
  { value: 'practice', label: 'תרגול' },
]

export default function TemplateManager({ onExit, onStartPractice }) {
  const [sentences, setSentences] = useState(() => getSentences())
  const [newText, setNewText] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  function handleAdd(e) {
    e.preventDefault()
    if (!newText.trim()) return
    setSentences(addSentence(newText))
    setNewText('')
  }

  function startEdit(s) {
    setConfirmDeleteId(null)
    setEditingId(s.id)
    setEditText(s.text)
  }

  function saveEdit(id) {
    if (!editText.trim()) return
    setSentences(updateSentence(id, editText))
    setEditingId(null)
  }

  function handleDeleteClick(id) {
    if (confirmDeleteId === id) {
      setSentences(deleteSentence(id))
      setConfirmDeleteId(null)
      if (editingId === id) setEditingId(null)
    } else {
      setConfirmDeleteId(id)
    }
  }

  function move(id, dir) {
    setSentences(moveSentence(id, dir))
  }

  return (
    <div className="wizard">
      <div className="wizard-topbar">
        <button className="icon-back-btn" onClick={onExit} aria-label="לתפריט חיבור">
          →
        </button>
        <ModeSwitch mode="manage" options={MODES} onChange={(m) => m === 'practice' && onStartPractice()} />
      </div>

      <h2>ניהול משפטים</h2>

      <form className="dict-form" onSubmit={handleAdd}>
        <textarea
          placeholder="הוספת משפט חדש (יתווסף בסוף הרשימה)"
          rows={2}
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
        />
        <button type="submit" className="primary-btn">
          הוספת משפט
        </button>
      </form>

      <p className="summary-line">{sentences.length} משפטים בטמפלייט</p>

      {sentences.length === 0 ? (
        <p className="summary-line">הטמפלייט ריק. הוסיפו משפט ראשון למעלה.</p>
      ) : (
        <div className="word-list">
          {sentences.map((s, i) => (
            <div key={s.id} className="word-row">
              {editingId === s.id ? (
                <div className="dict-form">
                  <textarea rows={3} value={editText} onChange={(e) => setEditText(e.target.value)} />
                  <div className="word-row-actions">
                    <button className="primary-btn" onClick={() => saveEdit(s.id)}>
                      שמירה
                    </button>
                    <button className="secondary-btn" onClick={() => setEditingId(null)}>
                      ביטול
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="word-row-main">
                    <div className="word-row-word">{i + 1}.</div>
                    <div className="word-row-def">{s.text}</div>
                  </div>
                  <div className="word-row-actions">
                    <button className="link-btn" onClick={() => move(s.id, -1)} disabled={i === 0} aria-label="הזזה למעלה">
                      ↑
                    </button>
                    <button
                      className="link-btn"
                      onClick={() => move(s.id, 1)}
                      disabled={i === sentences.length - 1}
                      aria-label="הזזה למטה"
                    >
                      ↓
                    </button>
                    <button className="link-btn" onClick={() => startEdit(s)}>
                      עריכה
                    </button>
                    <button
                      className={`link-btn danger-link ${confirmDeleteId === s.id ? 'confirm' : ''}`}
                      onClick={() => handleDeleteClick(s.id)}
                    >
                      {confirmDeleteId === s.id ? 'לאשר מחיקה?' : 'מחיקה'}
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {sentences.length > 0 && (
        <button className="primary-btn big" style={{ marginTop: 20 }} onClick={onStartPractice}>
          התחל תרגול
        </button>
      )}
    </div>
  )
}
