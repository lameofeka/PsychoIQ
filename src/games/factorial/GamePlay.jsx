import { useEffect, useMemo, useRef, useState } from 'react'
import { generateRound } from './logic'
import { recordFactResult } from './stats'
import { vibrateSuccess } from '../../utils/haptics'
import { useKeypadPress } from '../../utils/useKeypadPress'
import { useHtmlClassLock } from '../../utils/useHtmlClassLock'

const FEEDBACK_DELAY_MS = 900
const MAX_ANSWER_DIGITS = 3
const RETRY_BUFFER = 3

export default function GamePlay({ settings, onFinish, onExitQuiz }) {
  useHtmlClassLock('quant-gameplay-lock')
  const initialQuestions = useMemo(() => generateRound(settings), [settings])
  const [queue, setQueue] = useState(initialQuestions)
  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useState(null) // 'correct' | 'wrong' | null
  // Non-blocking "כל הכבוד" flash on a correct answer — unlike `feedback`,
  // this never disables the keypad or delays the next question, so it
  // doesn't slow down a confident user running fast down the list.
  const [correctFlash, setCorrectFlash] = useState(false)
  const [firstAttempts, setFirstAttempts] = useState(() => new Map())
  const [resolvedIds, setResolvedIds] = useState(() => new Set())
  const [pressedKey, press] = useKeypadPress()
  const startTimeRef = useRef(Date.now())
  const inputRef = useRef(null)
  // Mirrors `input` synchronously — reading this instead of the `input`
  // state closure in appendDigit lets two fast keypresses (physical keyboard
  // repeat, or a quick double-tap on the on-screen keypad) both land even if
  // the second one fires before React re-renders and hands appendDigit a
  // fresh closure. Every setInput call below has a matching write here.
  const inputValueRef = useRef('')

  const current = queue[0]
  const total = initialQuestions.length
  const correctCount = [...firstAttempts.values()].filter((a) => a.isCorrect).length
  const wrongCount = [...firstAttempts.values()].filter((a) => !a.isCorrect).length
  const progressPercent = Math.round((resolvedIds.size / total) * 100)

  useEffect(() => {
    inputRef.current?.focus()
  }, [current?.id])

  function appendDigit(digit) {
    if (feedback || inputValueRef.current.length >= MAX_ANSWER_DIGITS) return
    const next = inputValueRef.current + digit
    inputValueRef.current = next
    setInput(next)
    if (next.length >= String(current.answer).length) {
      submitAnswer(next)
    }
  }

  function handleBackspace() {
    if (feedback) return
    const next = inputValueRef.current.slice(0, -1)
    inputValueRef.current = next
    setInput(next)
  }

  function handleClear() {
    if (feedback) return
    inputValueRef.current = ''
    setInput('')
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
    recordFactResult(question.n, isCorrect)

    const isFirstAttempt = !firstAttempts.has(question.id)
    const nextFirstAttempts = isFirstAttempt
      ? new Map(firstAttempts).set(question.id, { question, userAnswer, isCorrect })
      : firstAttempts
    if (isFirstAttempt) setFirstAttempts(nextFirstAttempts)

    // Correct answers advance immediately (correctFlash is a non-blocking
    // "כל הכבוד" flash, not a pause) — a confident user can run straight
    // down the list at full typing speed. Only a wrong answer stops the
    // run to show the right value.
    if (isCorrect) {
      vibrateSuccess()
      setCorrectFlash(true)
      setTimeout(() => setCorrectFlash(false), 500)
      setResolvedIds((prev) => new Set(prev).add(question.id))
      const rest = queue.slice(1)
      inputValueRef.current = ''
      setInput('')
      if (rest.length === 0) {
        onFinish({
          answers: [...nextFirstAttempts.values()],
          elapsedMs: Date.now() - startTimeRef.current,
        })
        return
      }
      setQueue(rest)
      return
    }

    setFeedback('wrong')
    setTimeout(() => {
      const rest = queue.slice(1)
      const insertAt = Math.min(rest.length, RETRY_BUFFER)
      rest.splice(insertAt, 0, question)

      inputValueRef.current = ''
      setInput('')
      setFeedback(null)
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

      <div className="quiz-progress">
        <div className="quiz-progress-row">
          <span>{resolvedIds.size} / {total}</span>
          <span className="quiz-progress-score">
            <span className="correct">✔︎ {correctCount}</span>
            <span className="wrong">✘ {wrongCount}</span>
          </span>
        </div>
        <div className="quiz-progress-track">
          <div className="quiz-progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <div className={`question-card ${feedback ?? (correctFlash ? 'correct' : '')}`}>
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
        </form>

        <div className="numeric-keypad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              className={`keypad-btn ${pressedKey === digit ? 'pressed' : ''}`}
              onClick={() => {
                press(digit)
                appendDigit(digit)
              }}
              disabled={!!feedback}
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            className={`keypad-btn keypad-clear ${pressedKey === 'clear' ? 'pressed' : ''}`}
            onClick={() => {
              press('clear')
              handleClear()
            }}
            disabled={!!feedback || input === ''}
            aria-label="נקה"
          >
            נקה
          </button>
          <button
            type="button"
            className={`keypad-btn ${pressedKey === '0' ? 'pressed' : ''}`}
            onClick={() => {
              press('0')
              appendDigit('0')
            }}
            disabled={!!feedback}
          >
            0
          </button>
          <button
            type="button"
            className={`keypad-btn keypad-action ${pressedKey === 'backspace' ? 'pressed' : ''}`}
            onClick={() => {
              press('backspace')
              handleBackspace()
            }}
            disabled={!!feedback}
            aria-label="מחיקת ספרה"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 4H8l-6 8 6 8h13a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1z" />
              <line x1="17" y1="9" x2="11" y2="15" />
              <line x1="11" y1="9" x2="17" y2="15" />
            </svg>
          </button>
        </div>

        {correctFlash && <div className="feedback-msg correct">כל הכבוד! נכון ✔</div>}
        {feedback === 'wrong' && (
          <div className="feedback-msg wrong">
            לא נכון. התשובה הנכונה: {current.answer}
          </div>
        )}
      </div>
    </div>
  )
}
