import { useEffect, useMemo, useRef, useState } from 'react'
import { generateRound, OPERATIONS } from './logic'
import { recordFactResult } from './stats'

const FEEDBACK_DELAY_MS = 900
// Longest possible answer is "112" (fraction 1/12 typed as two boxes with
// no separator), so a couple more digits than a plain degree number.
const MAX_ANSWER_LEN = 4
// Same buffered-retry rules as the multiplication quiz: a wrong answer
// resurfaces a few questions later, and has to be answered correctly twice
// in a row before it's considered learned.
const RETRY_BUFFER = 5
const RETRY_PASSES_NEEDED = 2

export default function GamePlay({ settings, onFinish, onExitQuiz }) {
  const questions = useMemo(() => generateRound(settings), [settings])
  const [queue, setQueue] = useState(questions)
  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useState(null) // 'correct' | 'wrong' | null
  const [correctCount, setCorrectCount] = useState(0)
  const [wrongCount, setWrongCount] = useState(0)
  const startTimeRef = useRef(Date.now())
  const inputRef = useRef(null)
  const firstAttemptsRef = useRef(new Map())
  const retryPassesRef = useRef(new Map())

  const current = queue[0]
  const totalQuestions = questions.length
  const progressPercent = Math.round((correctCount / totalQuestions) * 100)
  const isFractionAnswer = current?.operation === OPERATIONS.DEGREES_TO_FRACTION
  // The numerator box is done after this many digits, then typing jumps
  // straight into the denominator box — no separate "field focus" state
  // needed, it's derived purely from how many digits have been typed so far.
  const numeratorLen = isFractionAnswer ? String(current.fact.numerator).length : 0
  const numeratorDisplay = isFractionAnswer ? input.slice(0, numeratorLen) : ''
  const denominatorDisplay = isFractionAnswer ? input.slice(numeratorLen) : ''

  useEffect(() => {
    inputRef.current?.focus()
  }, [current?.id])

  function appendChar(ch) {
    if (feedback || input.length >= MAX_ANSWER_LEN) return
    const next = input + ch
    setInput(next)
    if (next.length >= current.answer.length) {
      submitAnswer(next)
    }
  }

  function handleBackspace() {
    if (feedback) return
    setInput((prev) => prev.slice(0, -1))
  }

  function handleClear() {
    if (feedback) return
    setInput('')
  }

  function handleInputKeyDown(e) {
    if (feedback) return
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault()
      appendChar(e.key)
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
    const isCorrect = value === question.answer
    recordFactResult(question.fact.degrees, isCorrect)
    setFeedback(isCorrect ? 'correct' : 'wrong')

    const isFirstAttempt = !firstAttemptsRef.current.has(question.id)
    let requeue

    if (isFirstAttempt) {
      firstAttemptsRef.current.set(question.id, { question, userAnswer: value, isCorrect })
      if (isCorrect) setCorrectCount((c) => c + 1)
      else setWrongCount((c) => c + 1)
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
          {current.prefix}
          <span className="answer-blank">{feedback ? current.displayAnswer : ' '}</span>
          {current.suffix}
        </div>

        {isFractionAnswer && (
          <div className="fraction-input">
            <div className={`fraction-box ${input.length < numeratorLen ? 'active' : ''}`}>
              {numeratorDisplay || ' '}
            </div>
            <div className="fraction-line" />
            <div className={`fraction-box ${input.length >= numeratorLen ? 'active' : ''}`}>
              {denominatorDisplay || ' '}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className={isFractionAnswer ? 'fraction-form' : ''}>
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
            className={isFractionAnswer ? 'sr-only-input' : ''}
          />
          {!feedback && (
            <button type="submit" className="primary-btn">
              בדוק
            </button>
          )}
        </form>

        <div className="numeric-keypad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              className="keypad-btn"
              onClick={() => appendChar(digit)}
              disabled={!!feedback}
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            className="keypad-btn keypad-action"
            onClick={handleClear}
            disabled={!!feedback}
          >
            נקה
          </button>
          <button type="button" className="keypad-btn" onClick={() => appendChar('0')} disabled={!!feedback}>
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

        {feedback === 'correct' && <div className="feedback-msg correct">כל הכבוד! נכון ✔</div>}
        {feedback === 'wrong' && (
          <div className="feedback-msg wrong">
            לא נכון. התשובה הנכונה: {current.displayAnswer}
          </div>
        )}
      </div>
    </div>
  )
}
