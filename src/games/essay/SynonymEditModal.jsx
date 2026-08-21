import { useState } from 'react'
import Modal from '../vocabulary/Modal'
import { getSynonymLevel } from './stats'

// Word-edit popup, shared by the progress map (click a word card) and the
// quiz screen (double-click the current word) - same rename field plus the
// full synonym add/edit/delete/reorder UI in both places, just driven by
// whichever storage callbacks the caller wires up.
export default function SynonymEditModal({
  set,
  onClose,
  onSaveWord,
  onAddSynonym,
  onEditSynonym,
  onDeleteSynonym,
  onMoveSynonym,
}) {
  const [popupWordText, setPopupWordText] = useState(set.word)
  const [newSynText, setNewSynText] = useState('')
  const [editingSynId, setEditingSynId] = useState(null)
  const [editSynText, setEditSynText] = useState('')
  const [editSynUsage, setEditSynUsage] = useState('')

  function savePopupWord() {
    if (!popupWordText.trim()) return
    onSaveWord(popupWordText)
  }

  function handleAddSynonym() {
    const text = newSynText.trim()
    if (!text) return
    onAddSynonym(text)
    setNewSynText('')
  }

  function startEditSyn(syn) {
    setEditingSynId(syn.id)
    setEditSynText(syn.text)
    setEditSynUsage(syn.usage ?? '')
  }

  function saveEditSyn() {
    if (!editSynText.trim()) return
    onEditSynonym(editingSynId, editSynText, editSynUsage)
    setEditingSynId(null)
  }

  return (
    <Modal title={`עריכת מילה: ${set.word}`} onClose={onClose}>
      <div className="dict-form">
        <input type="text" value={popupWordText} onChange={(e) => setPopupWordText(e.target.value)} autoFocus />
        <button className="primary-btn" onClick={savePopupWord} disabled={!popupWordText.trim()}>
          שמירת שם המילה
        </button>
      </div>

      {set.synonyms.length > 0 && (
        <ol className="synonym-list">
          {set.synonyms.map((syn, i) =>
            editingSynId === syn.id ? (
              <li key={syn.id} className="synonym-item synonym-item-editing synonym-item-editing-block">
                <div className="synonym-item-editing-row">
                  <input type="text" value={editSynText} onChange={(e) => setEditSynText(e.target.value)} autoFocus />
                  <button className="link-btn" onClick={saveEditSyn}>
                    שמירה
                  </button>
                  <button className="link-btn" onClick={() => setEditingSynId(null)}>
                    ביטול
                  </button>
                </div>
                <input
                  type="text"
                  className="synonym-usage-input"
                  placeholder="אופן שימוש (אופציונלי, למשל: 'לתמורה חיובית')"
                  value={editSynUsage}
                  onChange={(e) => setEditSynUsage(e.target.value)}
                />
              </li>
            ) : (
              <li key={syn.id} className="synonym-item">
                <span className="synonym-item-text-wrap">
                  <span className="synonym-item-text progress-row-title">
                    <span className={`dot level-${getSynonymLevel(syn.id)}`} />
                    {syn.text}
                  </span>
                  {syn.usage && <span className="synonym-item-usage">{syn.usage}</span>}
                </span>
                <span className="synonym-item-actions">
                  <button className="link-btn" onClick={() => onMoveSynonym(syn.id, -1)} disabled={i === 0} aria-label="הזזה למעלה">
                    ↑
                  </button>
                  <button
                    className="link-btn"
                    onClick={() => onMoveSynonym(syn.id, 1)}
                    disabled={i === set.synonyms.length - 1}
                    aria-label="הזזה למטה"
                  >
                    ↓
                  </button>
                  <button className="link-btn" onClick={() => startEditSyn(syn)}>
                    עריכה
                  </button>
                  <button className="link-btn danger-link" onClick={() => onDeleteSynonym(syn.id)}>
                    מחיקה
                  </button>
                </span>
              </li>
            ),
          )}
        </ol>
      )}

      <div className="synonym-add-form">
        <input
          type="text"
          placeholder="מילה נרדפת חדשה (שפה גבוהה)"
          value={newSynText}
          onChange={(e) => setNewSynText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleAddSynonym()
            }
          }}
        />
        <button className="secondary-btn" onClick={handleAddSynonym}>
          הוספה
        </button>
      </div>
    </Modal>
  )
}
