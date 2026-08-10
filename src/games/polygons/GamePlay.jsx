import { useEffect, useMemo, useRef, useState } from 'react'
import { generateRound } from './logic'
import { recordFactResult } from './stats'
import { vibrateSuccess } from '../../utils/haptics'
import { useKeypadPress } from '../../utils/useKeypadPress'
import { useHtmlClassLock } from '../../utils/useHtmlClassLock'
import PolygonShape from './PolygonShape'

const FEEDBACK_DELAY_MS = 900
// Longest possible answer is the sum of angles (up to 4 digits, e.g. 1080);
// a single interior/central angle never exceeds 3.
const MAX_ANSWER_LEN = 4
// Same buffered-retry rules as the other quant quizzes: a wrong answer
// resurfaces a few questions later, and has to be answered correctly twice
// in a row before it's considered learned.
const RETRY_BUFFER = 5
const RETRY_PASSES_NEEDED = 2

export default function GamePlay({ settings, onFinish, onExitQuiz }) {
  useHtmlClassLock('quant-gameplay-lock')
  const questions = useMemo(() => generateRound(settings), [settings])
  const [queue, setQueue] = useState(questions)
  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useState(null) // 'correct' | 'wrong' | null
  const [correctCount, setCorrectCount] = useState(0)
  const [wrongCount, setWrongCount] = useState(0)
  const startTimeRef = useRef(Date.now())
  const inputRef = useRef(null)
  // Mirrors `input` synchronously — reading this instead of the `input`
  // state closure in appendChar lets two fast keypresses (physical keyboard
  // repeat, or a quick double-tap on the on-screen keypad) both land even if
  // the second one fires before React re-renders and hands appendChar a
  // fresh closure. Every setInput call below has a matching write here.
  const inputValueRef = useRef('')
  const [pressedKey, press] = useKeypadPress()
  const firstAttemptsRef = useRef(new Map())
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
      } else if (e.key === 'Backspace' || e.key === 'Tab') {
        e.preventDefault()
        restartChain()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [feedback, settings.inOrder])

  function appendChar(ch) {
    if (feedback || inputValueRef.current.length >= MAX_ANSWER_LEN) return
    const next = inputValueRef.current + ch
    inputValueRef.current = next
    setInput(next)
    if (next.length >= String(current.answer).length) {
      submitAnswer(next)
    }
  }

  function handleBackspace() {
    if (feedback) return
    if (inputValueRef.current === '') {
      submitAnswer('')
      return
    }
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
    if (feedback) return

    const question = current
    // An empty submission (Enter/Backspace pressed on a blank field) always
    // counts as wrong instead of being ignored.
    const isCorrect = value.trim() !== '' && value === String(question.answer)
    // Chain mode is a drilled, retry-until-correct practice run, not a
    // diagnostic pass — keep it out of the weak/strong progress-map stats.
    if (!settings.inOrder) recordFactResult(question.sides, isCorrect)
    setFeedback(isCorrect ? 'correct' : 'wrong')
    if (isCorrect) vibrateSuccess()

    // Chain mode ("לפי הסדר"): a wrong answer pauses the round in place -
    // the user picks "המשך מכאן" (retry this question) or "התחל מהתחלה"
    // (reset the whole round) instead of silently moving on.
    if (settings.inOrder && !isCorrect) return

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
    inputValueRef.current = ''
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
    inputValueRef.current = ''
    setInput('')
    setFeedback(null)
  }

  function restartChain() {
    firstAttemptsRef.current = new Map()
    retryPassesRef.current = new Map()
    startTimeRef.current = Date.now()
    setCorrectCount(0)
    setWrongCount(0)
    inputValueRef.current = ''
    setInput('')
    setFeedback(null)
    setQueue(questions)
  }

  if (!current) return null

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
            <span className="correct">✔︎ {correctCount}</span>
            <span className="wrong">✘ {wrongCount}</span>
          </span>
        </div>
        <div className="quiz-progress-track">
          <div className="quiz-progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <div className={`question-card polygon-question-card ${feedback ?? ''}`}>
        <div className="polygon-shape-wrap">
          <PolygonShape sides={current.sides} />
          <div className="polygon-shape-name">{current.name}</div>
        </div>

        <div className="polygon-fact-rows">
          <div className="polygon-fact-row active-row">
            <span className="polygon-fact-label">{current.label}</span>
            <span>=</span>
            <span>°</span>
            <span className="answer-blank">{(feedback ? current.answer : input) || ' '}</span>
          </div>
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
            className="sr-only-input"
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
                appendChar(digit)
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
              appendChar('0')
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

        {feedback === 'correct' && <div className="feedback-msg correct">כל הכבוד! נכון ✔</div>}
        {feedback === 'wrong' && (
          <div className="feedback-msg wrong">לא נכון. התשובה הנכונה: {current.answer}°</div>
        )}
        {feedback === 'wrong' && settings.inOrder && (
          <div className="results-actions chain-actions">
            <button className="primary-btn" onClick={continueChain}>
              המשך מכאן
            </button>
            <button className="secondary-btn chain-restart-btn" onClick={restartChain}>
              התחל מהתחלה
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
