import { useEffect, useMemo, useRef, useState } from 'react'
import { generateRound } from './logic'
import { recordFactResult } from './stats'
import { vibrateSuccess } from '../../utils/haptics'
import { useKeypadPress } from '../../utils/useKeypadPress'
import { useHtmlClassLock } from '../../utils/useHtmlClassLock'
import PolygonShape from './PolygonShape'

const FEEDBACK_DELAY_MS = 900
// Longest possible answer among sum (up to 4 digits, e.g. 1080), a single
// interior angle (up to 3 digits), or the central angle (up to 3 digits).
const MAX_ANSWER_LEN = 4
// Same buffered-retry rules as the other quant quizzes: a wrong answer
// resurfaces a few questions later, and has to be answered correctly twice
// in a row before it's considered learned. Every resurfacing re-asks all
// three sub-answers, not just the one that was wrong.
const RETRY_BUFFER = 5
const RETRY_PASSES_NEEDED = 2

const STAGES = [
  { key: 'sum', label: 'סכום הזוויות' },
  { key: 'angle', label: 'זווית אחת' },
  { key: 'central', label: 'הזווית המרכזית' },
]

export default function GamePlay({ settings, onFinish, onExitQuiz }) {
  useHtmlClassLock('quant-gameplay-lock')
  const questions = useMemo(() => generateRound(settings), [settings])
  const [queue, setQueue] = useState(questions)
  const [stageIndex, setStageIndex] = useState(0)
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
  // Results (right or wrong) for each stage of the current question, reset
  // every time the question changes. Not state - only read at submit time.
  const resultsRef = useRef({})

  const current = queue[0]
  const totalQuestions = questions.length
  const progressPercent = Math.round((correctCount / totalQuestions) * 100)
  const activeStage = STAGES[stageIndex]
  const activeAnswer = current ? String(current[activeStage.key]) : ''

  useEffect(() => {
    inputRef.current?.focus()
  }, [current?.id, stageIndex])

  function appendChar(ch) {
    if (feedback || inputValueRef.current.length >= MAX_ANSWER_LEN) return
    const next = inputValueRef.current + ch
    inputValueRef.current = next
    setInput(next)
    if (next.length >= activeAnswer.length) {
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
    const stageKey = activeStage.key
    const isCorrect = value === String(question[stageKey])
    recordFactResult(question.sides, isCorrect)
    setFeedback(isCorrect ? 'correct' : 'wrong')
    if (isCorrect) vibrateSuccess()

    resultsRef.current[stageKey] = { value, isCorrect }

    if (stageIndex < STAGES.length - 1) {
      setTimeout(() => {
        setStageIndex((i) => i + 1)
        inputValueRef.current = ''
        setInput('')
        setFeedback(null)
      }, FEEDBACK_DELAY_MS)
      return
    }

    const overallCorrect = STAGES.every((s) => resultsRef.current[s.key]?.isCorrect)
    const isFirstAttempt = !firstAttemptsRef.current.has(question.id)
    let requeue

    if (isFirstAttempt) {
      firstAttemptsRef.current.set(question.id, {
        question,
        results: { ...resultsRef.current },
        isCorrect: overallCorrect,
      })
      if (overallCorrect) setCorrectCount((c) => c + 1)
      else setWrongCount((c) => c + 1)
      if (!overallCorrect) retryPassesRef.current.set(question.id, RETRY_PASSES_NEEDED)
      requeue = !overallCorrect
    } else {
      const remaining = retryPassesRef.current.get(question.id) ?? RETRY_PASSES_NEEDED
      if (overallCorrect) {
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
    setStageIndex(0)
    resultsRef.current = {}

    if (rest.length === 0) {
      const finalAnswers = questions.map((q) => firstAttemptsRef.current.get(q.id)).filter(Boolean)
      onFinish({ answers: finalAnswers, elapsedMs: Date.now() - startTimeRef.current })
      return
    }
    setQueue(rest)
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
          {STAGES.slice(0, stageIndex + 1).map((s, i) => {
            const isActive = i === stageIndex
            const result = resultsRef.current[s.key]
            const displayValue = result ? current[s.key] : isActive ? (feedback ? current[s.key] : input) : ''
            return (
              <div key={s.key} className={`polygon-fact-row ${isActive ? 'active-row' : ''}`}>
                <span className="polygon-fact-label">{s.label}</span>
                <span>=</span>
                <span className="answer-blank">{displayValue !== '' ? displayValue : ' '}</span>
                <span>°</span>
              </div>
            )
          })}
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
          <div className="feedback-msg wrong">
            לא נכון. התשובה הנכונה: {current[activeStage.key]}°
          </div>
        )}
      </div>
    </div>
  )
}
