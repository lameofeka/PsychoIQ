import { useRef, useState } from 'react'
import {
  getSynonymSets,
  addSynonymSet,
  updateSynonymSetWord,
  deleteSynonymSet,
  addSynonym,
  updateSynonym,
  deleteSynonym,
  moveSynonym,
  swapSynonymSets,
} from './storage'
import { getSynonymLevel, getSynonymSetLevel } from './stats'
import SynonymEditModal from './SynonymEditModal'

function GripIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <circle cx="9" cy="6" r="1.6" />
      <circle cx="15" cy="6" r="1.6" />
      <circle cx="9" cy="12" r="1.6" />
      <circle cx="15" cy="12" r="1.6" />
      <circle cx="9" cy="18" r="1.6" />
      <circle cx="15" cy="18" r="1.6" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0-.8 12.2a1 1 0 0 1-1 .8H8.8a1 1 0 0 1-1-.8L7 7" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  )
}

export default function SynonymsProgressMap({ onBack, onStartPractice, onPracticeWeak }) {
  const [sets, setSets] = useState(() => getSynonymSets())
  // Editing happens inline on this same screen instead of navigating to a
  // separate page - toggling this just swaps the read-only synonym lists for
  // an editable trash/click-to-edit affordance, keeping the same card grid.
  const [editMode, setEditMode] = useState(false)
  const [newWord, setNewWord] = useState('')
  const [confirmDeleteSetId, setConfirmDeleteSetId] = useState(null)

  // Word-edit popup: opened by clicking a word's card, in either mode - no
  // need to enter edit mode first just to edit one word's synonyms.
  const [openSetId, setOpenSetId] = useState(null)

  // Drag-to-reorder: a pointer-events based implementation (not native HTML5
  // drag-and-drop) so it also works on touch/iOS, where this app mostly
  // runs as a home-screen app. Dragging is only armed from the grip handle,
  // so the rest of the card stays scrollable/tappable as normal.
  const [dragId, setDragId] = useState(null)
  const [overId, setOverId] = useState(null)
  const dragActiveRef = useRef(false)

  const practicable = sets.filter((s) => s.synonyms.length > 0)
  // Same order the words appear in when practiced (the raw, authored/dragged
  // order), not sorted by mastery level - so the map's layout lines up with
  // the order the words show up in the quiz.
  const rows = practicable.map((s) => ({ set: s, level: getSynonymSetLevel(s) }))
  const weakSets = rows.filter((r) => r.level !== 'green').map((r) => r.set)
  const openSet = sets.find((s) => s.id === openSetId) ?? null

  function handleAddSet(e) {
    e.preventDefault()
    if (!newWord.trim()) return
    setSets(addSynonymSet(newWord))
    setNewWord('')
  }

  function handleDeleteSet(id) {
    if (confirmDeleteSetId === id) {
      setSets(deleteSynonymSet(id))
      setConfirmDeleteSetId(null)
      if (openSetId === id) setOpenSetId(null)
    } else {
      setConfirmDeleteSetId(id)
    }
  }

  function openWordPopup(s) {
    setOpenSetId(s.id)
  }

  function closeWordPopup() {
    setOpenSetId(null)
  }

  function handleHandlePointerDown(e, id) {
    e.preventDefault()
    dragActiveRef.current = true
    setDragId(id)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handleHandlePointerMove(e) {
    if (!dragActiveRef.current) return
    const el = document.elementFromPoint(e.clientX, e.clientY)
    const card = el?.closest('[data-set-id]')
    setOverId(card?.getAttribute('data-set-id') ?? null)
  }

  function endDrag(sourceId, targetId) {
    dragActiveRef.current = false
    setDragId(null)
    setOverId(null)
    if (sourceId && targetId && sourceId !== targetId) {
      setSets(swapSynonymSets(sourceId, targetId))
    }
  }

  function handleHandlePointerUp() {
    if (!dragActiveRef.current) return
    endDrag(dragId, overId)
  }

  return (
    <div className="wizard progress-map">
      <div className="wizard-topbar">
        <button className="icon-back-btn" onClick={onBack} aria-label="לתפריט חיבור">
          →
        </button>
      </div>

      <h2>מפת התקדמות - מילים נרדפות</h2>
      <p className="summary-line">
        {sets.length} מילים · {practicable.length} מוכנות לתרגול
        {!editMode && '. כל מילה נרדפת צבועה לפי כמה שאתם זוכרים אותה.'}
      </p>

      {editMode && (
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
      )}

      {!editMode ? (
        practicable.length === 0 ? (
          <p className="summary-line">אין עדיין מילים מוכנות לתרגול. לחצו על עריכת מילים כדי להוסיף מילה נרדפת ראשונה.</p>
        ) : (
          <div className="word-list synonym-progress-list">
            {rows.map(({ set, level }) => (
              <div
                key={set.id}
                className="word-row word-row-clickable"
                role="button"
                tabIndex={0}
                onClick={() => openWordPopup(set)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openWordPopup(set)
                  }
                }}
              >
                <div className="word-row-main">
                  <div className="progress-row-title">
                    <span className={`dot level-${level}`} />
                    <span className="word-row-word">{set.word}</span>
                  </div>
                  <ol className="synonym-list">
                    {set.synonyms.map((syn) => (
                      <li key={syn.id} className="synonym-item">
                        <span className="synonym-item-text progress-row-title">
                          <span className={`dot level-${getSynonymLevel(syn.id)}`} />
                          {syn.text}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            ))}
          </div>
        )
      ) : sets.length === 0 ? (
        <p className="summary-line">אין עדיין מילים. הוסיפו מילה ראשונה למעלה.</p>
      ) : (
        <div className="word-list synonym-progress-list">
          {sets.map((s) => (
            <div
              key={s.id}
              data-set-id={s.id}
              className={`word-row ${dragId === s.id ? 'dragging' : ''} ${overId === s.id && dragId !== s.id ? 'drag-over' : ''}`}
            >
              <div className="word-row-main">
                <div className="progress-row-title synonym-edit-title">
                  <button
                    type="button"
                    className="drag-handle-btn"
                    aria-label="גרירה לשינוי סדר"
                    onPointerDown={(e) => handleHandlePointerDown(e, s.id)}
                    onPointerMove={handleHandlePointerMove}
                    onPointerUp={handleHandlePointerUp}
                    onPointerCancel={() => endDrag(null, null)}
                  >
                    <GripIcon />
                  </button>
                  <span className={`dot level-${getSynonymSetLevel(s)}`} />
                  <button type="button" className="word-row-word synonym-word-btn" onClick={() => openWordPopup(s)}>
                    {s.word}
                  </button>
                  <button
                    type="button"
                    className={`icon-trash-btn ${confirmDeleteSetId === s.id ? 'confirm' : ''}`}
                    onClick={() => handleDeleteSet(s.id)}
                    aria-label={confirmDeleteSetId === s.id ? 'לאשר מחיקת מילה' : 'מחיקת מילה'}
                    title={confirmDeleteSetId === s.id ? 'לאשר מחיקה?' : 'מחיקת מילה'}
                  >
                    <TrashIcon />
                  </button>
                </div>

                {s.synonyms.length === 0 ? (
                  <p className="synonym-empty-hint">אין עדיין מילים נרדפות - לחצו על המילה כדי להוסיף</p>
                ) : (
                  <ol className="synonym-list">
                    {s.synonyms.map((syn) => (
                      <li key={syn.id} className="synonym-item">
                        <span className="synonym-item-text progress-row-title">
                          <span className={`dot level-${getSynonymLevel(syn.id)}`} />
                          {syn.text}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {openSet && (
        <SynonymEditModal
          set={openSet}
          onClose={closeWordPopup}
          onSaveWord={(text) => setSets(updateSynonymSetWord(openSet.id, text))}
          onAddSynonym={(text) => setSets(addSynonym(openSet.id, text))}
          onEditSynonym={(synId, text, usage) => setSets(updateSynonym(openSet.id, synId, text, usage))}
          onDeleteSynonym={(synId) => setSets(deleteSynonym(openSet.id, synId))}
          onMoveSynonym={(synId, dir) => setSets(moveSynonym(openSet.id, synId, dir))}
        />
      )}

      {!editMode && (
        <div className="legend">
          <span className="legend-item">
            <i className="dot level-green" /> זוכר/ת היטב
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
      )}

      <div className="results-actions">
        <button className="secondary-btn" disabled={weakSets.length === 0} onClick={() => onPracticeWeak(weakSets)}>
          {weakSets.length === 0 ? 'מושלם' : `תרגול חולשות (${weakSets.length})`}
        </button>
        <button className="primary-btn big" disabled={practicable.length === 0} onClick={onStartPractice}>
          התחל תרגול
        </button>
        <button type="button" className="link-btn" onClick={() => setEditMode((v) => !v)}>
          {editMode ? 'סיום עריכה' : 'עריכת מילים'}
        </button>
      </div>
    </div>
  )
}
