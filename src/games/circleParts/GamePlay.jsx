import { useEffect, useMemo, useRef, useState } from 'react'
import { generateRound, OPERATIONS } from './logic'
import { recordFactResult } from './stats'
import { vibrateSuccess } from '../../utils/haptics'
import { useKeypadPress } from '../../utils/useKeypadPress'

const FEEDBACK_DELAY_MS = 900
// Longest possible answer is "112" (fraction 1/12 typed as two boxes with
// no separator) or a mixed percent like "6623" (66 2/3%), so a couple more
// digits than a plain degree number.
const MAX_ANSWER_LEN = 4
// Same buffered-retry rules as the multiplication quiz: a wrong answer
// resurfaces a few questions later, and has to be answered correctly twice
// in a row before it's considered learned. Every resurfacing re-asks both
// the main answer and the percent answer, not just the part that was wrong.
const RETRY_BUFFER = 5
const RETRY_PASSES_NEEDED = 2

// Which sub-answer opens first depends on which quantity the question
// already shows: shown degrees → fraction first (as before), shown a
// fraction → percent first, degrees second (the "place" for the fact's
// own conversion only opens once the percent is answered).
function firstStageFor(question) {
  return question?.operation === OPERATIONS.FRACTION_TO_DEGREES ? 'percent' : 'main'
}

export default function GamePlay({ settings, onFinish, onExitQuiz }) {
  const questions = useMemo(() => generateRound(settings), [settings])
  const [queue, setQueue] = useState(questions)
  const [stage, setStage] = useState(() => firstStageFor(questions[0])) // 'main' | 'percent'
  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useState(null) // 'correct' | 'wrong' | null
  const [correctCount, setCorrectCount] = useState(0)
  const [wrongCount, setWrongCount] = useState(0)
  const startTimeRef = useRef(Date.now())
  const inputRef = useRef(null)
  const [pressedKey, press] = useKeypadPress()
  const firstAttemptsRef = useRef(new Map())
  const retryPassesRef = useRef(new Map())
  // null until that stage has been answered (correctly or not) for the
  // current question; also doubles as "has this part been reached yet".
  const mainResultRef = useRef(null)
  const percentResultRef = useRef(null)

  const current = queue[0]
  const totalQuestions = questions.length
  const progressPercent = Math.round((correctCount / totalQuestions) * 100)
  const isMainStage = stage === 'main'
  const isFractionAnswer = isMainStage && current?.operation === OPERATIONS.DEGREES_TO_FRACTION
  const isPercentStage = stage === 'percent'
  const percentHasFraction = isPercentStage && current.percent.fracNumerator != null
  const activeAnswer = isMainStage ? current?.answer : current?.percent.answer
  const activeDisplayAnswer = isMainStage ? current?.displayAnswer : current?.percent.displayAnswer

  const mainReached = isMainStage || !!mainResultRef.current
  const percentReached = isPercentStage || !!percentResultRef.current

  // The numerator box is done after this many digits, then typing jumps
  // straight into the denominator box — no separate "field focus" state
  // needed, it's derived purely from how many digits have been typed so far.
  const numeratorLen = isFractionAnswer ? String(current.fact.numerator).length : 0
  const numeratorDisplay = isFractionAnswer ? input.slice(0, numeratorLen) : ''
  const denominatorDisplay = isFractionAnswer ? input.slice(numeratorLen) : ''

  const wholeLen = isPercentStage ? String(current.percent.whole).length : 0
  const fracNumLen = percentHasFraction ? String(current.percent.fracNumerator).length : 0
  const wholeDisplay = isPercentStage ? input.slice(0, wholeLen) : ''
  const fracNumDisplay = percentHasFraction ? input.slice(wholeLen, wholeLen + fracNumLen) : ''
  const fracDenDisplay = percentHasFraction ? input.slice(wholeLen + fracNumLen) : ''

  useEffect(() => {
    inputRef.current?.focus()
  }, [current?.id, stage])

  function appendChar(ch) {
    if (feedback || input.length >= MAX_ANSWER_LEN) return
    const next = input + ch
    setInput(next)
    if (next.length >= activeAnswer.length) {
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
    const isCorrect = value === activeAnswer
    recordFactResult(question.fact.degrees, isCorrect)
    setFeedback(isCorrect ? 'correct' : 'wrong')
    if (isCorrect) vibrateSuccess()

    if (isMainStage) mainResultRef.current = { value, isCorrect }
    else percentResultRef.current = { value, isCorrect }

    if (!mainResultRef.current || !percentResultRef.current) {
      const nextStage = isMainStage ? 'percent' : 'main'
      setTimeout(() => {
        setStage(nextStage)
        setInput('')
        setFeedback(null)
      }, FEEDBACK_DELAY_MS)
      return
    }

    const overallCorrect = mainResultRef.current.isCorrect && percentResultRef.current.isCorrect
    const isFirstAttempt = !firstAttemptsRef.current.has(question.id)
    let requeue

    if (isFirstAttempt) {
      firstAttemptsRef.current.set(question.id, {
        question,
        mainAnswer: mainResultRef.current.value,
        percentAnswer: percentResultRef.current.value,
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
    setInput('')
    setFeedback(null)
    setStage(firstStageFor(rest[0]))
    mainResultRef.current = null
    percentResultRef.current = null

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
            <span className="correct">✔︎ {correctCount}</span>
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
          {mainReached && (
            <>
              <span className="answer-blank">{mainResultRef.current ? current.displayAnswer : ' '}</span>
              {current.suffix}
            </>
          )}
        </div>

        {percentReached && (
          <div className="percent-question-text">
            וכמה אחוזים זה מהמעגל?{' '}
            <span className="answer-blank">{percentResultRef.current ? current.percent.displayAnswer : ' '}</span>
          </div>
        )}

        {isFractionAnswer && (
          <div className="fraction-input">
            <div className={`fraction-box ${input.length < numeratorLen ? 'active' : ''}`}>
              {numeratorDisplay || ' '}
            </div>
            <div className="fraction-line" />
            <div className={`fraction-box ${input.length >= numeratorLen ? 'active' : ''}`}>
              {denominatorDisplay || ' '}
            </div>
          </div>
        )}

        {isPercentStage && (
          <div className="percent-input">
            <div className={`fraction-box ${input.length < wholeLen ? 'active' : ''}`}>
              {wholeDisplay || ' '}
            </div>
            {percentHasFraction && (
              <div className="fraction-input mini-fraction">
                <div className={`fraction-box ${input.length >= wholeLen && input.length < wholeLen + fracNumLen ? 'active' : ''}`}>
                  {fracNumDisplay || ' '}
                </div>
                <div className="fraction-line" />
                <div className={`fraction-box ${input.length >= wholeLen + fracNumLen ? 'active' : ''}`}>
                  {fracDenDisplay || ' '}
                </div>
              </div>
            )}
            <span className="percent-sign">%</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className={isFractionAnswer || isPercentStage ? 'fraction-form' : ''}>
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
            className={isFractionAnswer || isPercentStage ? 'sr-only-input' : ''}
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
            לא נכון. התשובה הנכונה: {activeDisplayAnswer}
          </div>
        )}
      </div>
    </div>
  )
}
