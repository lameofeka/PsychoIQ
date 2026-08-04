import { useEffect, useMemo, useRef, useState } from 'react'
import { generateRound } from './logic'
import { recordFactResult } from './stats'

const FEEDBACK_DELAY_MS = 900
const MAX_ANSWER_DIGITS = 3
const RETRY_BUFFER = 3

export default function GamePlay({ settings, onFinish, onExitQuiz }) {
  const initialQuestions = useMemo(() => generateRound(settings), [settings])
  const [queue, setQueue] = useState(initialQuestions)
  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useState(null) // 'correct' | 'wrong' | null
  const [firstAttempts, setFirstAttempts] = useState(() => new Map())
  const [resolvedIds, setResolvedIds] = useState(() => new Set())
  const startTimeRef = useRef(Date.now())
  const inputRef = useRef(null)

  const current = queue[0]
  const total = initialQuestions.length
  const correctCount = [...firstAttempts.values()].filter((a) => a.isCorrect).length

  useEffect(() => {
    inputRef.current?.focus()
  }, [current?.id])

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

    const userAnswer = Number(value)
    const isCorrect = userAnswer === current.answer
    recordFactResult(current.n, isCorrect)
    setFeedback(isCorrect ? 'correct' : 'wrong')

    const isFirstAttempt = !firstAttempts.has(current.id)
    const nextFirstAttempts = isFirstAttempt
      ? new Map(firstAttempts).set(current.id, { question: current, userAnswer, isCorrect })
      : firstAttempts
    if (isFirstAttempt) setFirstAttempts(nextFirstAttempts)
    if (isCorrect) setResolvedIds((prev) => new Set(prev).add(current.id))

    setTimeout(() => {
      const rest = queue.slice(1)
      if (!isCorrect) {
        const insertAt = Math.min(rest.length, RETRY_BUFFER)
        rest.splice(insertAt, 0, current)
      }

      setInput('')
      setFeedback(null)

      if (rest.length === 0) {
        onFinish({
          answers: [...nextFirstAttempts.values()],
          elapsedMs: Date.now() - startTimeRef.current,
        })
        return
      }

      setQueue(rest)
    }, FEEDBACK_DELAY_MS)
  }

  return (
    <div className="gameplay">
      <div className="wizard-topbar">
        <button className="icon-back-btn" onClick={onExitQuiz} aria-label="יציאה מהתרגול">
          →
        </button>
      </div>

      <div className="progress-row">
        <span>
          שאלה {resolvedIds.size + 1} מתוך {total}
        </span>
        <span>ניקוד: {correctCount}</span>
      </div>

      <div className={`question-card ${feedback ?? ''}`}>
        <div className="question-text">
          {current.prefix}
          <span className="answer-blank">{feedback ? current.answer : ' '}</span>
          {current.suffix}
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

        {feedback === 'correct' && <div className="feedback-msg correct">כל הכבוד! נכון ✔</div>}
        {feedback === 'wrong' && (
          <div className="feedback-msg wrong">
            לא נכון. התשובה הנכונה: {current.answer}
          </div>
        )}
      </div>
    </div>
  )
}
