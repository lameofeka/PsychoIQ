import { useEffect, useRef, useState } from 'react'
import { PRIMES } from './logic'
import { recordPrimeResult } from './stats'

const FEEDBACK_DELAY_MS = 900
const MAX_ANSWER_DIGITS = 2

export default function GamePlay({ onFinish, onExitQuiz }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useState(null) // 'correct' | 'wrong' | null
  const [correctCount, setCorrectCount] = useState(0)
  const [wrongCount, setWrongCount] = useState(0)
  const startTimeRef = useRef(Date.now())
  const inputRef = useRef(null)
  // First-attempt result per chain position, since the position (currentIndex)
  // gets replayed on a wrong answer's "המשך מכאן" — only the first try counts
  // for scoring. Refs so the setTimeout closure below always reads the latest
  // totals, never a stale one from the render that scheduled it.
  const attemptedRef = useRef(new Set())
  const correctCountRef = useRef(0)
  const wrongCountRef = useRef(0)

  const total = PRIMES.length
  const current = PRIMES[currentIndex]
  const previous = currentIndex > 0 ? PRIMES[currentIndex - 1] : null
  const progressPercent = Math.round((currentIndex / total) * 100)

  useEffect(() => {
    inputRef.current?.focus()
  }, [currentIndex, feedback])

  useEffect(() => {
    if (feedback !== 'wrong') return
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
  }, [feedback])

  function appendDigit(digit) {
    if (feedback || input.length >= MAX_ANSWER_DIGITS) return
    const next = input + digit
    setInput(next)
    const answer = String(current)
    // Fail fast: submit the moment the typed digits can no longer be a
    // prefix of the correct answer (e.g. typing "9" when the answer is
    // "11"), instead of waiting for a second digit that would never help.
    if (!answer.startsWith(next) || next.length >= answer.length) {
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

    const isCorrect = Number(value) === current
    recordPrimeResult(current, isCorrect)
    setFeedback(isCorrect ? 'correct' : 'wrong')

    if (!attemptedRef.current.has(currentIndex)) {
      attemptedRef.current.add(currentIndex)
      if (isCorrect) {
        correctCountRef.current += 1
        setCorrectCount(correctCountRef.current)
      } else {
        wrongCountRef.current += 1
        setWrongCount(wrongCountRef.current)
      }
    }

    // Wrong answers stop the chain in place — "המשך מכאן" / "התחל מהתחלה"
    // take over instead of auto-continuing.
    if (!isCorrect) return

    setTimeout(() => {
      const nextIndex = currentIndex + 1
      setInput('')
      setFeedback(null)
      if (nextIndex >= total) {
        onFinish({
          correctCount: correctCountRef.current,
          wrongCount: wrongCountRef.current,
          elapsedMs: Date.now() - startTimeRef.current,
        })
        return
      }
      setCurrentIndex(nextIndex)
    }, FEEDBACK_DELAY_MS)
  }

  function continueChain() {
    setInput('')
    setFeedback(null)
  }

  function restartChain() {
    attemptedRef.current = new Set()
    correctCountRef.current = 0
    wrongCountRef.current = 0
    startTimeRef.current = Date.now()
    setCurrentIndex(0)
    setCorrectCount(0)
    setWrongCount(0)
    setInput('')
    setFeedback(null)
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
          <span>{currentIndex} / {total}</span>
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
        <div className="question-text prime-question-text">
          {previous !== null && (
            <>
              <span className="prime-prev-number">{previous}</span>
              <span className="prime-prev-arrow">→</span>
            </>
          )}
          <span className="answer-blank">{feedback ? current : ' '}</span>
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
            לא נכון. המספר הראשוני הבא הוא {current}
          </div>
        )}
        {feedback === 'wrong' && (
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
            className="keypad-btn keypad-clear"
            onClick={handleClear}
            disabled={!!feedback || input === ''}
            aria-label="נקה"
          >
            נקה
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
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 4H8l-6 8 6 8h13a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1z" />
              <line x1="17" y1="9" x2="11" y2="15" />
              <line x1="11" y1="9" x2="17" y2="15" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
