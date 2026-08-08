import { useEffect, useMemo, useRef, useState } from 'react'
import { getWords, addWord, updateWord, deleteWord, importWords, getGroups, swapWords } from './dictionary'
import { isWordInMistakesList, lockMistake, setWordInMistakesList } from './stats'
import ModeSwitch from './ModeSwitch'
import Modal from './Modal'

const COPY_LABEL = 'העתק'

function AddIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function ImportIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3.5v11M8 10.5l4 4 4-4" />
      <path d="M4.5 16v3a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-3" />
    </svg>
  )
}

function ExportIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 14.5v-11M8 7.5l4-4 4 4" />
      <path d="M4.5 16v3a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-3" />
    </svg>
  )
}

export default function DictionaryManager({ onBack }) {
  const [words, setWords] = useState(() => getWords())
  const [newWord, setNewWord] = useState('')
  const [newDef, setNewDef] = useState('')
  const [newAas, setNewAas] = useState('')
  const [newInMistakes, setNewInMistakes] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editWord, setEditWord] = useState('')
  const [editDef, setEditDef] = useState('')
  const [editAas, setEditAas] = useState('')
  const [editInMistakes, setEditInMistakes] = useState(false)
  const [editInMistakesInitial, setEditInMistakesInitial] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [popup, setPopup] = useState(null) // null | 'add' | 'import' | 'export' | 'swap' | 'duplicate'
  const [duplicateMatch, setDuplicateMatch] = useState(null) // { existing, pending }
  const [importText, setImportText] = useState('')
  const [importError, setImportError] = useState(null)
  const [copyLabel, setCopyLabel] = useState(COPY_LABEL)
  const [search, setSearch] = useState('')
  const [swapWordId, setSwapWordId] = useState(null)
  const [swapMode, setSwapMode] = useState(null) // null | 'search' | 'group'
  const [swapSearch, setSwapSearch] = useState('')
  const [swapGroupIndex, setSwapGroupIndex] = useState(null)
  const exportTextareaRef = useRef(null)
  const [isNearTop, setIsNearTop] = useState(true)
  const [canJumpScroll, setCanJumpScroll] = useState(false)
  const [groupJumpOpen, setGroupJumpOpen] = useState(false)
  const [groupJumpValue, setGroupJumpValue] = useState('')
  const [groupJumpError, setGroupJumpError] = useState(null)
  const [highlightGroup, setHighlightGroup] = useState(null)
  const pendingScrollGroupRef = useRef(null)

  useEffect(() => {
    function updateScrollState() {
      const scrollTop = window.scrollY || document.documentElement.scrollTop
      const scrollableHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight
      setCanJumpScroll(scrollableHeight > 80)
      setIsNearTop(scrollTop < 200)
    }
    updateScrollState()
    window.addEventListener('scroll', updateScrollState, { passive: true })
    window.addEventListener('resize', updateScrollState)
    return () => {
      window.removeEventListener('scroll', updateScrollState)
      window.removeEventListener('resize', updateScrollState)
    }
  }, [words, search])

  function handleScrollJump() {
    if (isNearTop) {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  function scrollToGroupNow(n) {
    const el = document.getElementById(`word-group-${n}`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setHighlightGroup(n)
    setTimeout(() => setHighlightGroup((cur) => (cur === n ? null : cur)), 1500)
  }

  function jumpToGroup(value) {
    const n = Number(value)
    if (!Number.isInteger(n) || n < 1 || n > allGroups.length) {
      setGroupJumpError(`מספר קבוצה לא תקין (1-${allGroups.length})`)
      return
    }
    setGroupJumpError(null)
    setGroupJumpOpen(false)
    setGroupJumpValue('')
    if (search.trim()) {
      pendingScrollGroupRef.current = n
      setSearch('')
    } else {
      scrollToGroupNow(n)
    }
  }

  useEffect(() => {
    if (pendingScrollGroupRef.current !== null && search.trim() === '') {
      const n = pendingScrollGroupRef.current
      pendingScrollGroupRef.current = null
      requestAnimationFrame(() => scrollToGroupNow(n))
    }
  }, [search, words])

  const filteredWords = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return words
    return words.filter((w) => w.word.toLowerCase().includes(term) || w.def.toLowerCase().includes(term))
  }, [words, search])

  const groups = useMemo(() => getGroups(filteredWords), [filteredWords])
  const allGroups = useMemo(() => getGroups(words), [words])
  const exportText = useMemo(
    () => JSON.stringify(words.map((w) => ({ word: w.word, def: w.def, Aas: w.aas })), null, 2),
    [words],
  )

  const swapWord = words.find((w) => w.id === swapWordId)
  const swapSearchResults = useMemo(() => {
    const term = swapSearch.trim().toLowerCase()
    if (!term) return []
    return words.filter(
      (w) => w.id !== swapWordId && (w.word.toLowerCase().includes(term) || w.def.toLowerCase().includes(term)),
    )
  }, [words, swapSearch, swapWordId])

  function handleAdd(e) {
    e.preventDefault()
    if (!newWord.trim() || !newDef.trim()) return
    const pending = { word: newWord, def: newDef, aas: newAas, inMistakes: newInMistakes }
    const existing = words.find((w) => w.word.trim() === pending.word.trim())
    if (existing) {
      setDuplicateMatch({ existing, pending })
      setPopup('duplicate')
      return
    }
    commitAdd(pending)
  }

  function commitAdd({ word, def, aas, inMistakes }) {
    const updated = addWord({ word, def, aas })
    if (inMistakes) lockMistake(updated[updated.length - 1].id)
    setWords(updated)
    setNewWord('')
    setNewDef('')
    setNewAas('')
    setNewInMistakes(false)
  }

  function cancelDuplicate() {
    setDuplicateMatch(null)
    setPopup('add')
  }

  function confirmReplaceDuplicate() {
    const { existing, pending } = duplicateMatch
    if (pending.inMistakes !== isWordInMistakesList(existing.id)) setWordInMistakesList(existing.id, pending.inMistakes)
    setWords(updateWord(existing.id, { word: pending.word, def: pending.def, aas: pending.aas }))
    setDuplicateMatch(null)
    setNewWord('')
    setNewDef('')
    setNewAas('')
    setNewInMistakes(false)
    setPopup('add')
  }

  function startEdit(w) {
    setConfirmDeleteId(null)
    setEditingId(w.id)
    setEditWord(w.word)
    setEditDef(w.def)
    setEditAas(w.aas)
    const inMistakes = isWordInMistakesList(w.id)
    setEditInMistakes(inMistakes)
    setEditInMistakesInitial(inMistakes)
  }

  function cancelEdit() {
    setEditingId(null)
  }

  function saveEdit(id) {
    if (!editWord.trim() || !editDef.trim()) return
    if (editInMistakes !== editInMistakesInitial) setWordInMistakesList(id, editInMistakes)
    setWords(updateWord(id, { word: editWord, def: editDef, aas: editAas }))
    setEditingId(null)
  }

  function handleDeleteClick(id) {
    if (confirmDeleteId === id) {
      setWords(deleteWord(id))
      setConfirmDeleteId(null)
      if (editingId === id) setEditingId(null)
    } else {
      setConfirmDeleteId(id)
    }
  }

  function startSwap(w) {
    setSwapWordId(w.id)
    setSwapMode(null)
    setSwapSearch('')
    setSwapGroupIndex(null)
    setPopup('swap')
  }

  function closeSwap() {
    setPopup(null)
    setSwapWordId(null)
    setSwapMode(null)
    setSwapSearch('')
    setSwapGroupIndex(null)
  }

  function performSwap(targetId) {
    setWords(swapWords(swapWordId, targetId))
    closeSwap()
  }

  function openImport() {
    setImportError(null)
    setImportText('')
    setPopup('import')
  }

  function closePopup() {
    setPopup(null)
    setImportText('')
    setImportError(null)
  }

  function handleImportConfirm() {
    try {
      const parsed = JSON.parse(importText)
      if (!Array.isArray(parsed)) throw new Error('not an array')
      setWords(importWords(parsed))
      closePopup()
    } catch {
      setImportError('טקסט לא תקין. יש לוודא שזהו JSON בפורמט הנכון.')
    }
  }

  function selectExportText() {
    const el = exportTextareaRef.current
    if (el) {
      el.focus()
      el.select()
    }
  }

  function handleCopy() {
    selectExportText()
    let copied = false
    try {
      copied = document.execCommand('copy')
    } catch {
      copied = false
    }
    setCopyLabel(copied ? 'הועתק! ✔' : 'הטקסט מסומן - העתיקו עם Ctrl+C')
    setTimeout(() => setCopyLabel(COPY_LABEL), 2000)
  }

  return (
    <div className="wizard dict-manager">
      {canJumpScroll && (
        <button
          type="button"
          className="scroll-jump-btn"
          onClick={handleScrollJump}
          aria-label={isNearTop ? 'מעבר לחתית המילון' : 'מעבר לראש המילון'}
        >
          {isNearTop ? '↓' : '↑'}
        </button>
      )}
      <div className="wizard-topbar">
        <ModeSwitch mode="dictionary" onChange={(m) => m === 'practice' && onBack()} />
      </div>

      <h2>מילון</h2>

      <div className="dict-toolbar">
        <button className="dict-action-btn" onClick={() => setPopup('add')}>
          <AddIcon />
          הוספה
        </button>
        <button className="dict-action-btn" onClick={openImport}>
          <ImportIcon />
          ייבוא
        </button>
        <button className="dict-action-btn" onClick={() => setPopup('export')} disabled={words.length === 0}>
          <ExportIcon />
          ייצוא
        </button>
      </div>

      {popup === 'add' && (
        <Modal title="הוספת מילה למילון" onClose={closePopup}>
          <form className="dict-form" onSubmit={handleAdd}>
            <input type="text" placeholder="מילה" value={newWord} onChange={(e) => setNewWord(e.target.value)} autoFocus />
            <textarea placeholder="פירוש" rows={2} value={newDef} onChange={(e) => setNewDef(e.target.value)} />
            <textarea
              placeholder="אסוציאציה / רמז (לא חובה)"
              rows={2}
              value={newAas}
              onChange={(e) => setNewAas(e.target.value)}
            />
            <label className="dict-form-checkbox">
              <input type="checkbox" checked={newInMistakes} onChange={(e) => setNewInMistakes(e.target.checked)} />
              הצג בתרגול טעויות
            </label>
            <button type="submit" className="primary-btn">
              הוספת מילה למילון
            </button>
          </form>
        </Modal>
      )}

      {popup === 'duplicate' && duplicateMatch && (
        <Modal title="המילה כבר קיימת" onClose={cancelDuplicate}>
          <div className="duplicate-warning">
            <p className="summary-line">
              המילה &quot;{duplicateMatch.existing.word}&quot; כבר קיימת במילון עם הפירוש:
            </p>
            <p className="duplicate-existing-def">{duplicateMatch.existing.def}</p>
            <p className="summary-line">להחליף אותה בפירוש והרמז החדשים, או לבטל את ההוספה?</p>
            <div className="json-panel-actions">
              <button className="primary-btn" onClick={confirmReplaceDuplicate}>
                החלפה
              </button>
              <button className="secondary-btn" onClick={cancelDuplicate}>
                ביטול
              </button>
            </div>
          </div>
        </Modal>
      )}

      {popup === 'import' && (
        <Modal title="ייבוא מילון" onClose={closePopup}>
          <div className="json-panel">
            <textarea
              className="json-textarea"
              rows={6}
              placeholder="הדביקו כאן טקסט JSON"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              autoFocus
            />
            {importError && <p className="import-error">{importError}</p>}
            <div className="json-panel-actions">
              <button className="primary-btn" onClick={handleImportConfirm} disabled={!importText.trim()}>
                ייבוא
              </button>
              <button className="secondary-btn" onClick={closePopup}>
                ביטול
              </button>
            </div>
          </div>
        </Modal>
      )}

      {popup === 'export' && (
        <Modal title="ייצוא מילון" onClose={closePopup}>
          <div className="json-panel">
            <textarea
              ref={exportTextareaRef}
              className="json-textarea"
              rows={6}
              readOnly
              value={exportText}
              onFocus={(e) => e.target.select()}
              autoFocus
            />
            <div className="json-panel-actions">
              <button className="primary-btn" onClick={handleCopy}>
                {copyLabel}
              </button>
              <button className="secondary-btn" onClick={closePopup}>
                סגירה
              </button>
            </div>
          </div>
        </Modal>
      )}

      {popup === 'swap' && swapWord && (
        <Modal title={`החלפת מקום: ${swapWord.word}`} onClose={closeSwap}>
          {swapMode === null && (
            <div className="swap-mode-choice">
              <button className="secondary-btn" onClick={() => setSwapMode('search')}>
                חיפוש מילה
              </button>
              <button className="secondary-btn" onClick={() => setSwapMode('group')}>
                בחירת קבוצה
              </button>
            </div>
          )}

          {swapMode === 'search' && (
            <>
              <input
                type="text"
                className="modal-input"
                placeholder="חיפוש מילה או פירוש..."
                value={swapSearch}
                onChange={(e) => setSwapSearch(e.target.value)}
                autoFocus
              />
              <div className="swap-results">
                {swapSearch.trim() === '' ? (
                  <p className="summary-line">הקלידו כדי לחפש מילה להחלפה.</p>
                ) : swapSearchResults.length === 0 ? (
                  <p className="summary-line">לא נמצאו מילים.</p>
                ) : (
                  swapSearchResults.map((w) => (
                    <button key={w.id} className="swap-result-item" onClick={() => performSwap(w.id)}>
                      <span className="swap-result-word">{w.word}</span>
                      <span className="swap-result-def">{w.def}</span>
                    </button>
                  ))
                )}
              </div>
              <button className="link-btn" onClick={() => setSwapMode(null)}>
                → חזרה
              </button>
            </>
          )}

          {swapMode === 'group' && swapGroupIndex === null && (
            <>
              <div className="group-grid">
                {allGroups.map((g) => (
                  <button key={g.index} className="group-chip" onClick={() => setSwapGroupIndex(g.index)}>
                    <span className="group-chip-title">{g.index}</span>
                  </button>
                ))}
              </div>
              <button className="link-btn" onClick={() => setSwapMode(null)}>
                → חזרה
              </button>
            </>
          )}

          {swapMode === 'group' && swapGroupIndex !== null && (
            <>
              <div className="swap-results">
                {allGroups
                  .find((g) => g.index === swapGroupIndex)
                  .words.filter((w) => w.id !== swapWordId)
                  .map((w) => (
                    <button key={w.id} className="swap-result-item" onClick={() => performSwap(w.id)}>
                      <span className="swap-result-word">{w.word}</span>
                      <span className="swap-result-def">{w.def}</span>
                    </button>
                  ))}
              </div>
              <button className="link-btn" onClick={() => setSwapGroupIndex(null)}>
                → חזרה
              </button>
            </>
          )}
        </Modal>
      )}

      {words.length > 0 && (
        <div className="dict-search-row">
          <input
            type="text"
            className="dict-search"
            placeholder="חיפוש מילה או פירוש..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            type="button"
            className={`group-jump-toggle ${groupJumpOpen ? 'active' : ''}`}
            onClick={() => {
              setGroupJumpOpen((v) => !v)
              setGroupJumpError(null)
            }}
            aria-label="חיפוש לפי מספר קבוצה"
            title="חיפוש לפי מספר קבוצה"
          >
            #
          </button>
        </div>
      )}

      {groupJumpOpen && (
        <div className="group-jump-panel">
          <form
            className="group-jump-form"
            onSubmit={(e) => {
              e.preventDefault()
              jumpToGroup(groupJumpValue)
            }}
          >
            <input
              type="number"
              min={1}
              max={allGroups.length}
              className="group-jump-input"
              placeholder={`מספר קבוצה (1-${allGroups.length})`}
              value={groupJumpValue}
              onChange={(e) => setGroupJumpValue(e.target.value)}
              autoFocus
            />
            <button type="submit" className="secondary-btn">
              עבור
            </button>
          </form>
          {groupJumpError && <p className="import-error">{groupJumpError}</p>}
          <div className="group-jump-grid">
            {allGroups.map((g) => (
              <button key={g.index} type="button" className="group-jump-chip" onClick={() => jumpToGroup(g.index)}>
                {g.index}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="summary-line">
        {search.trim()
          ? `${filteredWords.length} תוצאות מתוך ${words.length} מילים`
          : `${words.length} מילים במילון · ${groups.length} קבוצות`}
      </p>

      {words.length === 0 ? (
        <p className="summary-line">המילון ריק. הוסיפו מילה ראשונה למעלה.</p>
      ) : groups.length === 0 ? (
        <p className="summary-line">לא נמצאו מילים תואמות.</p>
      ) : (
        <div className="word-list">
          {groups.map((g) => (
            <div
              key={g.index}
              id={`word-group-${g.index}`}
              className={`word-group ${highlightGroup === g.index ? 'word-group-highlight' : ''}`}
            >
              <h3 className="word-group-title">קבוצה {g.index}</h3>
              {g.words.map((w) => (
                <div key={w.id} className="word-row">
                  {editingId === w.id ? (
                    <div className="dict-form">
                      <input type="text" value={editWord} onChange={(e) => setEditWord(e.target.value)} />
                      <textarea rows={5} value={editDef} onChange={(e) => setEditDef(e.target.value)} placeholder="פירוש" />
                      <textarea rows={4} value={editAas} onChange={(e) => setEditAas(e.target.value)} placeholder="רמז" />
                      <label className="dict-form-checkbox">
                        <input
                          type="checkbox"
                          checked={editInMistakes}
                          onChange={(e) => setEditInMistakes(e.target.checked)}
                        />
                        הצג בתרגול טעויות
                      </label>
                      <div className="word-row-actions">
                        <button className="primary-btn" onClick={() => saveEdit(w.id)}>
                          שמירה
                        </button>
                        <button className="secondary-btn" onClick={cancelEdit}>
                          ביטול
                        </button>
                        <button className="link-btn" onClick={() => startSwap(w)}>
                          החלפת מקום
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="word-row-main">
                        <div className="word-row-word">{w.word}</div>
                        <div className="word-row-def">{w.def}</div>
                        {w.aas && <div className="word-row-aas">{w.aas}</div>}
                      </div>
                      <div className="word-row-actions">
                        <button className="link-btn" onClick={() => startEdit(w)}>
                          עריכה
                        </button>
                        <button
                          className={`link-btn danger-link ${confirmDeleteId === w.id ? 'confirm' : ''}`}
                          onClick={() => handleDeleteClick(w.id)}
                        >
                          {confirmDeleteId === w.id ? 'לאשר מחיקה?' : 'מחיקה'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
