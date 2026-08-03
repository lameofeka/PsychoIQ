import { useState } from 'react'
import {
  getSynonymSets,
  addSynonymSet,
  updateSynonymSetWord,
  deleteSynonymSet,
  addSynonym,
  updateSynonym,
  deleteSynonym,
  moveSynonym,
} from './storage'
import ModeSwitch from './ModeSwitch'

const MODES = [
  { value: 'manage', label: 'ניהול מילים נרדפות' },
  { value: 'practice', label: 'תרגול' },
]

export default function SynonymsManager({ onExit, onStartPractice }) {
  const [sets, setSets] = useState(() => getSynonymSets())
  const [newWord, setNewWord] = useState('')
  const [editingWordId, setEditingWordId] = useState(null)
  const [editWordText, setEditWordText] = useState('')
  const [confirmDeleteSetId, setConfirmDeleteSetId] = useState(null)
  const [newSynText, setNewSynText] = useState({}) // setId -> text
  const [editingSyn, setEditingSyn] = useState(null) // { setId, synId } | null
  const [editSynText, setEditSynText] = useState('')

  function handleAddSet(e) {
    e.preventDefault()
    if (!newWord.trim()) return
    setSets(addSynonymSet(newWord))
    setNewWord('')
  }

  function startEditWord(s) {
    setEditingWordId(s.id)
    setEditWordText(s.word)
  }

  function saveEditWord(id) {
    if (!editWordText.trim()) return
    setSets(updateSynonymSetWord(id, editWordText))
    setEditingWordId(null)
  }

  function handleDeleteSet(id) {
    if (confirmDeleteSetId === id) {
      setSets(deleteSynonymSet(id))
      setConfirmDeleteSetId(null)
    } else {
      setConfirmDeleteSetId(id)
    }
  }

  function handleAddSynonym(setId) {
    const text = (newSynText[setId] ?? '').trim()
    if (!text) return
    setSets(addSynonym(setId, text))
    setNewSynText((prev) => ({ ...prev, [setId]: '' }))
  }

  function startEditSyn(setId, syn) {
    setEditingSyn({ setId, synId: syn.id })
    setEditSynText(syn.text)
  }

  function saveEditSyn() {
    if (!editSynText.trim()) return
    setSets(updateSynonym(editingSyn.setId, editingSyn.synId, editSynText))
    setEditingSyn(null)
  }

  function handleDeleteSynonym(setId, synId) {
    setSets(deleteSynonym(setId, synId))
  }

  function moveSyn(setId, synId, dir) {
    setSets(moveSynonym(setId, synId, dir))
  }

  const practicable = sets.filter((s) => s.synonyms.length > 0)

  return (
    <div className="wizard">
      <div className="wizard-topbar">
        <button className="icon-back-btn" onClick={onExit} aria-label="לתפריט חיבור">
          →
        </button>
        <ModeSwitch mode="manage" options={MODES} onChange={(m) => m === 'practice' && onStartPractice()} />
      </div>

      <h2>ניהול מילים נרדפות</h2>

      <form className="dict-form" onSubmit={handleAddSet}>
        <input
          type="text"
          placeholder="מילה פשוטה (שפה נמוכה)"
          value={newWord}
          onChange={(e) => setNewWord(e.target.value)}
        />
        <button type="submit" className="primary-btn">
          הוספת מילה
        </button>
      </form>

      <p className="summary-line">{sets.length} מילים · {practicable.length} מוכנות לתרגול</p>

      {sets.length === 0 ? (
        <p className="summary-line">אין עדיין מילים. הוסיפו מילה ראשונה למעלה.</p>
      ) : (
        <div className="word-list">
          {sets.map((s) => (
            <div key={s.id} className="word-row synonym-set">
              <div className="word-row-main">
                {editingWordId === s.id ? (
                  <div className="dict-form">
                    <input type="text" value={editWordText} onChange={(e) => setEditWordText(e.target.value)} autoFocus />
                    <div className="word-row-actions">
                      <button className="primary-btn" onClick={() => saveEditWord(s.id)}>
                        שמירה
                      </button>
                      <button className="secondary-btn" onClick={() => setEditingWordId(null)}>
                        ביטול
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="word-row-word">{s.word}</div>
                )}

                <ol className="synonym-list">
                  {s.synonyms.map((syn, i) =>
                    editingSyn?.setId === s.id && editingSyn?.synId === syn.id ? (
                      <li key={syn.id} className="synonym-item synonym-item-editing">
                        <input type="text" value={editSynText} onChange={(e) => setEditSynText(e.target.value)} autoFocus />
                        <button className="link-btn" onClick={saveEditSyn}>
                          שמירה
                        </button>
                        <button className="link-btn" onClick={() => setEditingSyn(null)}>
                          ביטול
                        </button>
                      </li>
                    ) : (
                      <li key={syn.id} className="synonym-item">
                        <span className="synonym-item-text">
                          {i + 1}. {syn.text}
                        </span>
                        <span className="synonym-item-actions">
                          <button
                            className="link-btn"
                            onClick={() => moveSyn(s.id, syn.id, -1)}
                            disabled={i === 0}
                            aria-label="הזזה למעלה"
                          >
                            ↑
                          </button>
                          <button
                            className="link-btn"
                            onClick={() => moveSyn(s.id, syn.id, 1)}
                            disabled={i === s.synonyms.length - 1}
                            aria-label="הזזה למטה"
                          >
                            ↓
                          </button>
                          <button className="link-btn" onClick={() => startEditSyn(s.id, syn)}>
                            עריכה
                          </button>
                          <button className="link-btn danger-link" onClick={() => handleDeleteSynonym(s.id, syn.id)}>
                            מחיקה
                          </button>
                        </span>
                      </li>
                    ),
                  )}
                </ol>

                <div className="synonym-add-form">
                  <input
                    type="text"
                    placeholder="מילה נרדפת חדשה (שפה גבוהה)"
                    value={newSynText[s.id] ?? ''}
                    onChange={(e) => setNewSynText((prev) => ({ ...prev, [s.id]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddSynonym(s.id)
                      }
                    }}
                  />
                  <button className="secondary-btn" onClick={() => handleAddSynonym(s.id)}>
                    הוספה
                  </button>
                </div>
              </div>

              <div className="word-row-actions">
                <button className="link-btn" onClick={() => startEditWord(s)}>
                  עריכת מילה
                </button>
                <button
                  className={`link-btn danger-link ${confirmDeleteSetId === s.id ? 'confirm' : ''}`}
                  onClick={() => handleDeleteSet(s.id)}
                >
                  {confirmDeleteSetId === s.id ? 'לאשר מחיקה?' : 'מחיקת מילה'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {practicable.length > 0 && (
        <button className="primary-btn big" style={{ marginTop: 20 }} onClick={onStartPractice}>
          התחל תרגול
        </button>
      )}
    </div>
  )
}
