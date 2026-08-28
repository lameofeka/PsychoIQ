import { useEffect, useMemo, useRef, useState } from 'react'
import { generateRound } from './logic'
import { recordFactResult, markFactLearned } from './stats'
import { vibrateSuccess } from '../../utils/haptics'
import { useKeypadPress } from '../../utils/useKeypadPress'
import { useHtmlClassLock } from '../../utils/useHtmlClassLock'

const FEEDBACK_DELAY_MS = 900
// A correct answer only needs a quick flash before moving on; a wrong one
// keeps the full delay so there's time to actually read the right answer.
const FEEDBACK_DELAY_CORRECT_MS = FEEDBACK_DELAY_MS / 2
// Every triple number here is at most two digits (20).
const MAX_ANSWER_LEN = 2
// Same buffered-retry rules as the other quant quizzes: a wrong triple
// resurfaces a few questions later, and has to be answered correctly twice
// in a row before it's considered learned. Every resurfacing re-asks all of
// that triple's blanks (with a freshly-random given position), not just the
// one that was wrong.
const RETRY_BUFFER = 5
const RETRY_PASSES_NEEDED = 2

export default function GamePlay({ settings, onFinish, onExitQuiz }) {
  useHtmlClassLock('quant-gameplay-lock')
  const questions = useMemo(() => generateRound(settings), [settings])
  const [queue, setQueue] = useState(questions)
  const [stageIndex, setStageIndex] = useState(0)
  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useState(null) // 'correct' | 'wrong' | null
  const [correctCount, setCorrectCount] = useState(0)
  const [wrongCount, setWrongCount] = useState(0)
  // Questions that won't be requeued again (answered right first try, or
  // finished their retry passes) - the progress bar tracks *this*, not
  // correctCount, so it still reaches 100% at the end of the quiz even
  // though a missed-then-relearned question never counts toward correctCount.
  const [resolvedIds, setResolvedIds] = useState(() => new Set())
  const startTimeRef = useRef(Date.now())
  const inputRef = useRef(null)
  const inputValueRef = useRef('')
  const [pressedKey, press] = useKeypadPress()
  const firstAttemptsRef = useRef(new Map())
  const retryPassesRef = useRef(new Map())
  // Results (right or wrong) for each blank position (0/1/2) of the current
  // question, reset every time the question changes.
  const resultsRef = useRef({})

  const current = queue[0]
  const totalQuestions = questions.length
  const progressPercent = Math.round((resolvedIds.size / totalQuestions) * 100)
  const activePos = current?.blankIndices[stageIndex]
  const activeAnswer = current ? String(current.triple[activePos]) : ''

  useEffect(() => {
    inputRef.current?.focus()
  }, [current?.id, stageIndex, feedback])

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
    if (next.length >= activeAnswer.length) {
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
    const pos = activePos
    // An empty submission (Enter/Backspace pressed on a blank field) always
    // counts as wrong instead of being ignored.
    const isCorrect = value.trim() !== '' && value === String(question.triple[pos])
    // Chain mode is a drilled, retry-until-correct practice run, not a
    // diagnostic pass — keep it out of the weak/strong progress-map stats.
    if (!settings.inOrder) recordFactResult(question.id, isCorrect)
    setFeedback(isCorrect ? 'correct' : 'wrong')
    if (isCorrect) vibrateSuccess()

    resultsRef.current[pos] = { value, isCorrect }

    // Chain mode ("לפי הסדר"): a wrong answer pauses the round in place -
    // the user picks "המשך מכאן" (retry this same blank) or "התחל מהתחלה"
    // (reset the whole round) instead of silently moving on.
    if (settings.inOrder && !isCorrect) return

    if (stageIndex < question.blankIndices.length - 1) {
      setTimeout(() => {
        setStageIndex((i) => i + 1)
        inputValueRef.current = ''
        setInput('')
        setFeedback(null)
      }, isCorrect ? FEEDBACK_DELAY_CORRECT_MS : FEEDBACK_DELAY_MS)
      return
    }

    const overallCorrect = question.blankIndices.every((i) => resultsRef.current[i]?.isCorrect)
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
          markFactLearned(question.id)
        } else {
          retryPassesRef.current.set(question.id, nextRemaining)
          requeue = true
        }
      } else {
        retryPassesRef.current.set(question.id, RETRY_PASSES_NEEDED)
        requeue = true
      }
    }

    if (!requeue) setResolvedIds((prev) => new Set(prev).add(question.id))
    setTimeout(() => goNext(question, requeue), isCorrect ? FEEDBACK_DELAY_CORRECT_MS : FEEDBACK_DELAY_MS)
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

  function continueChain() {
    inputValueRef.current = ''
    setInput('')
    setFeedback(null)
  }

  function restartChain() {
    firstAttemptsRef.current = new Map()
    retryPassesRef.current = new Map()
    resultsRef.current = {}
    startTimeRef.current = Date.now()
    setCorrectCount(0)
    setWrongCount(0)
    setResolvedIds(new Set())
    inputValueRef.current = ''
    setInput('')
    setFeedback(null)
    setStageIndex(0)
    setQueue(questions)
  }

  if (!current) return null

  function renderSlot(pos) {
    if (pos === current.givenIndex) {
      return (
        <span key={pos} className="triple-given">
          {current.triple[pos]}
        </span>
      )
    }
    const blankOrder = current.blankIndices.indexOf(pos)
    const isActive = blankOrder === stageIndex
    const result = resultsRef.current[pos]
    const displayValue = result ? current.triple[pos] : isActive ? (feedback ? current.triple[pos] : input) : ''
    return (
      <span key={pos} className={`fraction-box ${isActive ? 'active' : ''}`}>
        {displayValue !== '' ? displayValue : ' '}
      </span>
    )
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
          <span>{resolvedIds.size} / {totalQuestions}</span>
          <span className="quiz-progress-score">
            <span className="correct">✔︎ {correctCount}</span>
            <span className="wrong">✘ {wrongCount}</span>
          </span>
        </div>
        <div className="quiz-progress-track">
          <div className="quiz-progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <div className={`question-card ${feedback ?? ''}`}>
        <div className="triple-row">
          {renderSlot(0)}
          <span className="triple-colon">:</span>
          {renderSlot(1)}
          <span className="triple-colon">:</span>
          {renderSlot(2)}
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
          <div className="feedback-msg wrong">לא נכון. התשובה הנכונה: {current.triple[activePos]}</div>
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
