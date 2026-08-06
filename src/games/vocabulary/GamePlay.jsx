import { useEffect, useMemo, useRef, useState } from 'react'
import { generateRound, checkAnswer } from './logic'
import { updateWord } from './dictionary'
import { excludeMistake } from './stats'
import { vibrateSuccess } from '../../utils/haptics'

const RETRY_BUFFER = 5
const RETRY_PASSES_NEEDED = 2
const DEFAULT_PROGRESS_SAVE_THRESHOLD = 30

export default function GamePlay({
  words,
  groupLabel,
  bufferedRetry,
  progressSaveThreshold = DEFAULT_PROGRESS_SAVE_THRESHOLD,
  onFinish,
  onProgressSave,
  onExitQuiz,
  onNextGroup,
  onPrevGroup,
}) {
  const questions = useMemo(() => generateRound(words), [words])
  const [index, setIndex] = useState(0)
  const [queue, setQueue] = useState(() => (bufferedRetry ? [...words] : []))
  const [pendingRequeue, setPendingRequeue] = useState(false)
  const [firstAttempts, setFirstAttempts] = useState(() => new Map())
  const [input, setInput] = useState('')
  const [verdict, setVerdict] = useState(null) // null | 'correct' | 'wrong'
  const [answers, setAnswers] = useState([])
  const [overrides, setOverrides] = useState({}) // id -> { def, aas }
  const [isEditing, setIsEditing] = useState(false)
  const [editDef, setEditDef] = useState('')
  const [editAas, setEditAas] = useState('')
  const startTimeRef = useRef(Date.now())
  const inputRef = useRef(null)
  // Per word: how many more correct answers in a row it needs before it's
  // done. Only touched from event handlers, never read during render.
  const retryPassesRef = useRef(new Map())
  // Words already handed to onProgressSave — past progressSaveThreshold we
  // save each new first-attempt immediately so quitting mid-session can't lose it.
  const committedIdsRef = useRef(new Set())

  const current = bufferedRetry ? queue[0] : questions[index]
  const override = overrides[current.id]
  const currentDef = override?.def ?? current.def
  const currentAas = override?.aas ?? current.aas

  const [removedCount, setRemovedCount] = useState(0)
  const totalWords = words.length - removedCount
  const firstCorrectCount = useMemo(
    () => [...firstAttempts.values()].filter((a) => a.isCorrect).length,
    [firstAttempts],
  )
  const correctCount = bufferedRetry ? firstCorrectCount : answers.filter((a) => a.isCorrect).length
  const wrongCount = bufferedRetry ? firstAttempts.size - firstCorrectCount : answers.length - correctCount
  const progressPercent = bufferedRetry
    ? Math.round((firstCorrectCount / totalWords) * 100)
    : Math.round((answers.length / questions.length) * 100)
  const isLastOverall = bufferedRetry ? queue.length === 1 && !pendingRequeue : index + 1 >= questions.length

  useEffect(() => {
    inputRef.current?.focus()
  }, [current?.id])

  function submitAnswer(isCorrect, userAnswer) {
    setVerdict(isCorrect ? 'correct' : 'wrong')
    if (isCorrect) vibrateSuccess()

    if (bufferedRetry) {
      const word = current
      const isFirstAttempt = !firstAttempts.has(word.id)
      if (isFirstAttempt) {
        const nextFirstAttempts = new Map(firstAttempts)
        nextFirstAttempts.set(word.id, { word, userAnswer, isCorrect })
        setFirstAttempts(nextFirstAttempts)

        if (onProgressSave && nextFirstAttempts.size >= progressSaveThreshold) {
          const toSave = [...nextFirstAttempts.values()].filter((a) => !committedIdsRef.current.has(a.word.id))
          if (toSave.length > 0) {
            onProgressSave(toSave)
            for (const a of toSave) committedIdsRef.current.add(a.word.id)
          }
        }

        if (!isCorrect) retryPassesRef.current.set(word.id, RETRY_PASSES_NEEDED)
        setPendingRequeue(!isCorrect)
      } else {
        const remaining = retryPassesRef.current.get(word.id) ?? RETRY_PASSES_NEEDED
        if (isCorrect) {
          const nextRemaining = remaining - 1
          if (nextRemaining <= 0) {
            retryPassesRef.current.delete(word.id)
            setPendingRequeue(false)
          } else {
            retryPassesRef.current.set(word.id, nextRemaining)
            setPendingRequeue(true)
          }
        } else {
          retryPassesRef.current.set(word.id, RETRY_PASSES_NEEDED)
          setPendingRequeue(true)
        }
      }
      return
    }

    setAnswers((prev) => [...prev, { word: current, userAnswer, isCorrect }])
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (verdict) return
    if (input.trim() === '') {
      submitAnswer(false, input)
      return
    }
    submitAnswer(checkAnswer(input, currentDef), input)
  }

  function goNext() {
    setIsEditing(false)

    if (bufferedRetry) {
      const rest = queue.slice(1)
      if (pendingRequeue) {
        const insertAt = Math.min(rest.length, RETRY_BUFFER)
        rest.splice(insertAt, 0, current)
      }
      if (rest.length === 0) {
        const finalAnswers = words.map((w) => firstAttempts.get(w.id)).filter(Boolean)
        onFinish({ answers: finalAnswers, elapsedMs: Date.now() - startTimeRef.current })
        return
      }
      setQueue(rest)
      setInput('')
      setVerdict(null)
      return
    }

    if (index + 1 < questions.length) {
      setIndex((i) => i + 1)
      setInput('')
      setVerdict(null)
    } else {
      onFinish({ answers, elapsedMs: Date.now() - startTimeRef.current })
    }
  }

  // Down arrow, mistakes practice only — permanently drop the word being
  // looked at right now out of the mistakes list and out of this session,
  // whether or not it's already been answered.
  function handleRemoveCurrentWord() {
    if (!bufferedRetry) return
    const word = current
    excludeMistake(word.id)
    retryPassesRef.current.delete(word.id)
    committedIdsRef.current.delete(word.id)
    setRemovedCount((c) => c + 1)
    setIsEditing(false)

    const rest = queue.slice(1)
    if (rest.length === 0) {
      const finalAnswers = words.map((w) => firstAttempts.get(w.id)).filter(Boolean)
      onFinish({ answers: finalAnswers, elapsedMs: Date.now() - startTimeRef.current })
      return
    }
    setQueue(rest)
    setInput('')
    setVerdict(null)
  }

  function startEditWord() {
    setEditDef(currentDef)
    setEditAas(currentAas)
    setIsEditing(true)
  }

  function saveEditWord() {
    if (!editDef.trim()) return
    updateWord(current.id, { word: current.word, def: editDef, aas: editAas })
    setOverrides((prev) => ({ ...prev, [current.id]: { def: editDef, aas: editAas } }))
    setIsEditing(false)
  }

  // Attached to document (rather than our own container) so it still fires
  // when focus is on a button (e.g. after clicking "לשאלה הבאה").
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'ArrowDown' && bufferedRetry) {
        e.preventDefault()
        handleRemoveCurrentWord()
        return
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        // Inside a text field with content, the arrow keys must move the
        // caret, not switch groups — but an empty field (or one that's just
        // displaying the already-submitted answer) has no caret position
        // worth preserving, so let the switch through. Unlike Tab/Enter
        // below, this isn't gated on focus being off a <button>, since a
        // focused button (e.g. after clicking "לשאלה הבאה") shouldn't block
        // group nav.
        const tag = e.target.tagName
        if ((tag === 'INPUT' || tag === 'TEXTAREA') && e.target.value && !verdict) return
        if (e.key === 'ArrowLeft' && onNextGroup) onNextGroup()
        else if (e.key === 'ArrowRight' && onPrevGroup) onPrevGroup()
        return
      }
      if (e.target.closest('button')) return
      if (e.key === 'Tab' && !verdict) {
        e.preventDefault()
        submitAnswer(false, input)
      } else if (e.key === 'Enter' && verdict && !isEditing) {
        e.preventDefault()
        goNext()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  })

  return (
    <div className="gameplay">
      {(onExitQuiz || groupLabel) && (
        <div className="wizard-topbar">
          {onExitQuiz && (
            <button className="icon-back-btn" onClick={onExitQuiz} aria-label="יציאה מהתרגול">
              →
            </button>
          )}
          {groupLabel && (
            <span className="quiz-group-nav">
              {onPrevGroup && (
                <button
                  type="button"
                  className="group-nav-arrow"
                  onClick={onPrevGroup}
                  aria-label="קבוצה קודמת"
                  title="קבוצה קודמת"
                >
                  →
                </button>
              )}
              <span className="quiz-group-label">{groupLabel}</span>
              {onNextGroup && (
                <button
                  type="button"
                  className="group-nav-arrow"
                  onClick={onNextGroup}
                  aria-label="קבוצה הבאה"
                  title="קבוצה הבאה"
                >
                  ←
                </button>
              )}
            </span>
          )}
        </div>
      )}

      <div className="quiz-progress">
        <div className="quiz-progress-row">
          <span>{bufferedRetry ? `${firstCorrectCount} / ${totalWords}` : `${index + 1} / ${questions.length}`}</span>
          <span className="quiz-progress-score">
            <span className="correct">✔︎ {correctCount}</span>
            <span className="wrong">✘ {wrongCount}</span>
          </span>
        </div>
        <div className="quiz-progress-track">
          <div className="quiz-progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <div className={`question-card ${verdict ?? ''}`}>
        <div className="question-text vocab-word">{current.word}</div>

        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            className="no-caret"
            value={input}
            // Never disabled/readOnly: either would blur the field (or, for
            // readOnly on iOS, silently drop the keyboard even while still
            // focused) and dismiss the on-screen keyboard, which then
            // reopens on the next question — that open/close cycle is what
            // made the page visibly jump. Keeping it focused and editable
            // the whole session avoids the keyboard (and the page under it)
            // toggling every single answer; edits are just ignored once a
            // verdict is in.
            onChange={(e) => !verdict && setInput(e.target.value)}
            placeholder="מה הפירוש?"
            autoFocus
          />
          {!verdict && (
            <button type="submit" className="primary-btn">
              בדוק
            </button>
          )}
        </form>

        {verdict && (
          <div className="vocab-reveal">
            <div className={`feedback-msg ${verdict}`}>{verdict === 'correct' ? 'נכון ✔︎' : 'טעות ✘'}</div>

            {isEditing ? (
              <div className="vocab-edit-form">
                <textarea rows={2} value={editDef} onChange={(e) => setEditDef(e.target.value)} placeholder="פירוש" />
                <textarea rows={2} value={editAas} onChange={(e) => setEditAas(e.target.value)} placeholder="רמז" />
                <div className="vocab-edit-form-actions">
                  <button type="button" className="primary-btn" onClick={saveEditWord}>
                    שמירה
                  </button>
                  <button type="button" className="secondary-btn" onClick={() => setIsEditing(false)}>
                    ביטול
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="vocab-answer">
                  <strong>פירוש: </strong>
                  {currentDef}
                </div>
                {currentAas && (
                  <div className="vocab-aas">
                    <strong>רמז: </strong>
                    {currentAas}
                  </div>
                )}
                <button className="primary-btn vocab-next-btn" onClick={goNext}>
                  {isLastOverall ? 'סיום' : 'לשאלה הבאה'}
                </button>
                <button className="link-btn edit-word-btn" onClick={startEditWord}>
                  עריכה
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {verdict && !isEditing && (
        <button type="button" className="next-word-fab" onClick={goNext} title="למילה הבאה">
          {isLastOverall ? 'סיום' : 'הבא'}
        </button>
      )}
    </div>
  )
}
