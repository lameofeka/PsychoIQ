import { useEffect, useMemo, useRef, useState } from 'react'
import { getRoundQuestions } from './logic'
import { recordFactResult } from './stats'

const FEEDBACK_DELAY_MS = 900
const MAX_ANSWER_DIGITS = 3
// Same buffered-retry rules as the vocabulary quiz: a wrong answer resurfaces
// a few questions later, and has to be answered correctly twice in a row
// before it's considered learned.
const RETRY_BUFFER = 5
const RETRY_PASSES_NEEDED = 2

export default function GamePlay({ settings, onFinish, onExitQuiz }) {
  const questions = useMemo(() => getRoundQuestions(settings), [settings])
  const [queue, setQueue] = useState(questions)
  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useState(null) // 'correct' | 'wrong' | null
  const [correctCount, setCorrectCount] = useState(0)
  const [wrongCount, setWrongCount] = useState(0)
  const startTimeRef = useRef(Date.now())
  const inputRef = useRef(null)
  // First-attempt result per question id — the source of truth for scoring
  // and the final results screen. A ref (not state) so the setTimeout closure
  // in submitAnswer always sees the latest value, never a stale one.
  const firstAttemptsRef = useRef(new Map())
  // Per question: how many more correct answers in a row it needs before
  // it's done. Only touched from event handlers, never read during render.
  const retryPassesRef = useRef(new Map())

  const current = queue[0]
  const totalQuestions = questions.length
  const progressPercent = Math.round((correctCount / totalQuestions) * 100)

  useEffect(() => {
    inputRef.current?.focus()
  }, [current?.id, feedback])

  useEffect(() => {
    if (feedback !== 'wrong' || !settings.inOrder) return
    function onKeyDown(e) {
      if (e.target.closest('button')) return
      if (e.key === 'Enter') {
        e.preventDefault()
        continueChain()
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        restartChain()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [feedback, settings.inOrder])

  function appendDigit(digit) {
    if (feedback || input.length >= MAX_ANSWER_DIGITS) return
    const next = input + digit
    setInput(next)
    if (next.length >= String(current.answer).length) {
      submitAnswer(next)
    }
  }

  function handleBackspace() {
    if (feedback) return
    setInput((prev) => prev.slice(0, -1))
  }

  function handleInputKeyDown(e) {
    if (feedback) return
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault()
      appendDigit(e.key)
    } else if (e.key === 'Backspace') {
      e.preventDefault()
      handleBackspace()
    } else if (e.key === 'Enter') {
      handleSubmit(e)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    submitAnswer(input)
  }

  function submitAnswer(value) {
    if (feedback || value.trim() === '') return

    const question = current
    const userAnswer = Number(value)
    const isCorrect = userAnswer === question.answer
    recordFactResult(question.a, question.b, isCorrect)
    setFeedback(isCorrect ? 'correct' : 'wrong')

    const isFirstAttempt = !firstAttemptsRef.current.has(question.id)
    if (isFirstAttempt) {
      firstAttemptsRef.current.set(question.id, { question, userAnswer, isCorrect })
      if (isCorrect) setCorrectCount((c) => c + 1)
      else setWrongCount((c) => c + 1)
    }

    // Chain mode ("לפי הסדר"): a wrong answer stops the chain in place —
    // the user picks "המשך מכאן" (retry) or "התחל מהתחלה" (restart) instead
    // of the buffered-retry queue silently resurfacing the question later.
    if (settings.inOrder) {
      if (isCorrect) setTimeout(() => goNext(question, false), FEEDBACK_DELAY_MS)
      return
    }

    let requeue
    if (isFirstAttempt) {
      if (!isCorrect) retryPassesRef.current.set(question.id, RETRY_PASSES_NEEDED)
      requeue = !isCorrect
    } else {
      const remaining = retryPassesRef.current.get(question.id) ?? RETRY_PASSES_NEEDED
      if (isCorrect) {
        const nextRemaining = remaining - 1
        if (nextRemaining <= 0) {
          retryPassesRef.current.delete(question.id)
          requeue = false
        } else {
          retryPassesRef.current.set(question.id, nextRemaining)
          requeue = true
        }
      } else {
        retryPassesRef.current.set(question.id, RETRY_PASSES_NEEDED)
        requeue = true
      }
    }

    setTimeout(() => goNext(question, requeue), FEEDBACK_DELAY_MS)
  }

  function goNext(question, requeue) {
    const rest = queue.slice(1)
    if (requeue) {
      const insertAt = Math.min(rest.length, RETRY_BUFFER)
      rest.splice(insertAt, 0, question)
    }
    setInput('')
    setFeedback(null)

    if (rest.length === 0) {
      const finalAnswers = questions.map((q) => firstAttemptsRef.current.get(q.id)).filter(Boolean)
      onFinish({ answers: finalAnswers, elapsedMs: Date.now() - startTimeRef.current })
      return
    }
    setQueue(rest)
  }

  function continueChain() {
    setInput('')
    setFeedback(null)
  }

  function restartChain() {
    firstAttemptsRef.current = new Map()
    retryPassesRef.current = new Map()
    startTimeRef.current = Date.now()
    setCorrectCount(0)
    setWrongCount(0)
    setInput('')
    setFeedback(null)
    setQueue(questions)
  }

  return (
    <div className="gameplay">
      <div className="wizard-topbar">
        <button className="icon-back-btn" onClick={onExitQuiz} aria-label="יציאה מהתרגול">
          →
        </button>
      </div>

      <div className="quiz-progress">
        <div className="quiz-progress-row">
          <span>{correctCount} / {totalQuestions}</span>
          <span className="quiz-progress-score">
            <span className="correct">✔ {correctCount}</span>
            <span className="wrong">✘ {wrongCount}</span>
          </span>
        </div>
        <div className="quiz-progress-track">
          <div className="quiz-progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <div className={`question-card ${feedback ?? ''}`}>
        <div className="question-text">
          {current.text} = <span className="answer-blank">{feedback ? current.answer : ' '}</span>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            inputMode="none"
            readOnly
            value={input}
            disabled={!!feedback}
            onKeyDown={handleInputKeyDown}
            placeholder="התשובה שלך"
            autoFocus
          />
          {!feedback && (
            <button type="submit" className="primary-btn">
              בדוק
            </button>
          )}
        </form>

        {feedback === 'correct' && <div className="feedback-msg correct">כל הכבוד! נכון ✔</div>}
        {feedback === 'wrong' && (
          <div className="feedback-msg wrong">
            לא נכון. התשובה הנכונה: {current.answer}
          </div>
        )}
        {feedback === 'wrong' && settings.inOrder && (
          <div className="results-actions chain-actions">
            <button className="primary-btn" onClick={continueChain}>
              המשך מכאן
            </button>
            <button className="secondary-btn" onClick={restartChain}>
              התחל מהתחלה
            </button>
          </div>
        )}

        <div className="numeric-keypad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              className="keypad-btn"
              onClick={() => appendDigit(digit)}
              disabled={!!feedback}
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            className="keypad-btn keypad-submit"
            onClick={() => submitAnswer(input)}
            disabled={!!feedback || input.trim() === ''}
            aria-label="בדוק תשובה"
          >
            ✓
          </button>
          <button type="button" className="keypad-btn" onClick={() => appendDigit('0')} disabled={!!feedback}>
            0
          </button>
          <button
            type="button"
            className="keypad-btn keypad-action"
            onClick={handleBackspace}
            disabled={!!feedback}
            aria-label="מחיקת ספרה"
          >
            ⌫
          </button>
        </div>
      </div>
    </div>
  )
}
