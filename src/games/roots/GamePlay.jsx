import { useEffect, useRef, useState } from 'react'
import { ROOTS_BY_ID, checkMeaningAnswer, checkWordAnswer, QUESTION_KINDS } from './logic'
import { recordFactResult, markFactLearned } from './stats'
import { vibrateSuccess } from '../../utils/haptics'

const RETRY_BUFFER = 5
const RETRY_PASSES_NEEDED = 2

export default function GamePlay({ questions, onFinish, onExitQuiz }) {
  const [queue, setQueue] = useState(questions)
  const [pendingRequeue, setPendingRequeue] = useState(false)
  const [firstAttempts, setFirstAttempts] = useState(() => new Map())
  // Questions that won't be requeued again (answered right first try, or
  // finished their retry passes) - the progress bar tracks *this*, not
  // firstCorrectCount, so it still reaches 100% at the end of the quiz even
  // though a missed-then-relearned question never counts toward
  // firstCorrectCount.
  const [resolvedIds, setResolvedIds] = useState(() => new Set())
  const [input, setInput] = useState('')
  const [verdict, setVerdict] = useState(null) // null | 'correct' | 'wrong'
  const startTimeRef = useRef(Date.now())
  const inputRef = useRef(null)
  // Per question: how many more correct answers in a row it needs before
  // it's considered learned. Only touched from event handlers, never read
  // during render.
  const retryPassesRef = useRef(new Map())

  const current = queue[0]
  const root = ROOTS_BY_ID.get(current.rootId)
  const isMeaning = current.kind === QUESTION_KINDS.MEANING

  const total = questions.length
  const firstCorrectCount = [...firstAttempts.values()].filter((a) => a.isCorrect).length
  const wrongCount = firstAttempts.size - firstCorrectCount
  const progressPercent = Math.round((resolvedIds.size / total) * 100)
  const isLastOverall = queue.length === 1 && !pendingRequeue

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true })
  }, [current?.id])

  // Same iOS keyboard-avoidance treatment as the vocabulary quiz's
  // GamePlay.jsx (see its comment for the full explanation): focusing this
  // free-text answer field opens the real keyboard, which iOS Safari
  // "reveals" by panning the visual viewport regardless of position:fixed -
  // cancelled here by forcing scroll back to (0, 0) on every attempt.
  useEffect(() => {
    const htmlEl = document.documentElement
    const body = document.body
    htmlEl.classList.add('vocab-quiz-lock')
    body.classList.add('vocab-quiz-lock')

    function syncHeight() {
      htmlEl.style.setProperty('--app-vh', `${window.innerHeight}px`)
    }
    syncHeight()
    window.addEventListener('resize', syncHeight)

    const vv = window.visualViewport
    function cancelPan() {
      window.scrollTo(0, 0)
    }
    vv?.addEventListener('resize', cancelPan)
    vv?.addEventListener('scroll', cancelPan)

    return () => {
      htmlEl.classList.remove('vocab-quiz-lock')
      body.classList.remove('vocab-quiz-lock')
      htmlEl.style.removeProperty('--app-vh')
      window.removeEventListener('resize', syncHeight)
      vv?.removeEventListener('resize', cancelPan)
      vv?.removeEventListener('scroll', cancelPan)
    }
  }, [])

  function submitAnswer(isCorrect, userAnswer) {
    setVerdict(isCorrect ? 'correct' : 'wrong')
    inputRef.current?.blur()
    if (isCorrect) vibrateSuccess()

    const question = current
    const isFirstAttempt = !firstAttempts.has(question.id)
    if (isFirstAttempt) {
      const nextFirstAttempts = new Map(firstAttempts)
      nextFirstAttempts.set(question.id, { question, userAnswer, isCorrect })
      setFirstAttempts(nextFirstAttempts)
      recordFactResult(question.id, isCorrect)

      if (!isCorrect) retryPassesRef.current.set(question.id, RETRY_PASSES_NEEDED)
      else setResolvedIds((prev) => new Set(prev).add(question.id))
      setPendingRequeue(!isCorrect)
    } else {
      const remaining = retryPassesRef.current.get(question.id) ?? RETRY_PASSES_NEEDED
      if (isCorrect) {
        const nextRemaining = remaining - 1
        if (nextRemaining <= 0) {
          retryPassesRef.current.delete(question.id)
          setPendingRequeue(false)
          markFactLearned(question.id)
          setResolvedIds((prev) => new Set(prev).add(question.id))
        } else {
          retryPassesRef.current.set(question.id, nextRemaining)
          setPendingRequeue(true)
        }
      } else {
        retryPassesRef.current.set(question.id, RETRY_PASSES_NEEDED)
        setPendingRequeue(true)
      }
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (verdict) return
    if (input.trim() === '') {
      submitAnswer(false, input)
      return
    }
    const isCorrect = isMeaning ? checkMeaningAnswer(input, root.meaning) : checkWordAnswer(input, root.words)
    submitAnswer(isCorrect, input)
  }

  function goNext() {
    const rest = queue.slice(1)
    if (pendingRequeue) {
      // Reinsert ~RETRY_BUFFER questions ahead, but never let repeated
      // misses wall off unseen questions: if the next RETRY_BUFFER slots are
      // all already-attempted retries, push the insert point past the next
      // fresh (never-attempted) question so the deck keeps moving forward.
      const firstFreshIdx = rest.findIndex((q) => !firstAttempts.has(q.id))
      const insertAt =
        firstFreshIdx === -1
          ? Math.min(rest.length, RETRY_BUFFER)
          : Math.min(rest.length, Math.max(RETRY_BUFFER, firstFreshIdx + 1))
      rest.splice(insertAt, 0, current)
    }
    if (rest.length === 0) {
      const finalAnswers = questions.map((q) => firstAttempts.get(q.id)).filter(Boolean)
      onFinish({ answers: finalAnswers, elapsedMs: Date.now() - startTimeRef.current })
      return
    }
    setQueue(rest)
    setInput('')
    setVerdict(null)
  }

  useEffect(() => {
    function onKeyDown(e) {
      if (e.target.closest('button')) return
      if (e.key === 'Tab' && !verdict) {
        e.preventDefault()
        submitAnswer(false, input)
      } else if (e.key === 'Enter' && verdict) {
        e.preventDefault()
        goNext()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  })

  return (
    <div className="gameplay vocab-gameplay">
      <div className="wizard-topbar">
        <button className="icon-back-btn" onClick={onExitQuiz} aria-label="יציאה מהתרגול">
          →
        </button>
      </div>

      <div className="quiz-progress">
        <div className="quiz-progress-row">
          <span>{resolvedIds.size} / {total}</span>
          <span className="quiz-progress-score">
            <span className="correct">✔︎ {firstCorrectCount}</span>
            <span className="wrong">✘ {wrongCount}</span>
          </span>
        </div>
        <div className="quiz-progress-track">
          <div className="quiz-progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <div className={`question-card ${verdict ?? ''}`}>
        <div className="question-text vocab-word" style={{ direction: 'ltr' }}>
          {root.root}
        </div>

        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            className="no-caret"
            dir={isMeaning ? 'rtl' : 'ltr'}
            value={input}
            onChange={(e) => !verdict && setInput(e.target.value)}
            placeholder={isMeaning ? 'מה המשמעות?' : 'כתוב/י מילה עם השורש הזה'}
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

            <div className="vocab-answer">
              <strong>{isMeaning ? 'משמעות: ' : 'מילים: '}</strong>
              {isMeaning ? root.meaning : root.words.join(' / ')}
            </div>

            <div className="vocab-aas">
              <strong>מילה לדוגמה: </strong>
              <span style={{ direction: 'ltr' }}>{root.example}</span>
            </div>

            <button className="primary-btn vocab-next-btn" onClick={goNext}>
              {isLastOverall ? 'סיום' : 'לשאלה הבאה'}
            </button>
          </div>
        )}
      </div>

      {verdict && (
        <button type="button" className="next-word-fab" onClick={goNext} title="לשאלה הבאה">
          {isLastOverall ? 'סיום' : 'הבא'}
        </button>
      )}
    </div>
  )
}
