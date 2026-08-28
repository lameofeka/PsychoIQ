import { useEffect, useMemo, useRef, useState } from 'react'
import { generateRound, OPERATIONS } from './logic'
import { recordFactResult, markFactLearned, fractionKey, percentKey } from './stats'
import { vibrateSuccess } from '../../utils/haptics'
import { useKeypadPress } from '../../utils/useKeypadPress'
import { useHtmlClassLock } from '../../utils/useHtmlClassLock'
import { FractionText, PercentText } from './FractionText'

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

export default function GamePlay({ settings, onFinish, onExitQuiz }) {
  useHtmlClassLock('quant-gameplay-lock')
  const questions = useMemo(() => generateRound(settings), [settings])
  const [queue, setQueue] = useState(questions)
  const [stage, setStage] = useState('main') // 'main' | 'percent' — main always opens first, percent second
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
  // Mirrors `input` synchronously — reading this instead of the `input`
  // state closure in appendChar lets two fast keypresses (physical keyboard
  // repeat, or a quick double-tap on the on-screen keypad) both land even if
  // the second one fires before React re-renders and hands appendChar a
  // fresh closure. Every setInput call below has a matching write here.
  const inputValueRef = useRef('')
  const [pressedKey, press] = useKeypadPress()
  const firstAttemptsRef = useRef(new Map())
  const retryPassesRef = useRef(new Map())
  // null until that stage has been answered (correctly or not) for the
  // current question; also doubles as "has this part been reached yet".
  const mainResultRef = useRef(null)
  const percentResultRef = useRef(null)

  const current = queue[0]
  const totalQuestions = questions.length
  const progressPercent = Math.round((resolvedIds.size / totalQuestions) * 100)
  const isMainStage = stage === 'main'
  const showsFractionBoxes = current?.operation === OPERATIONS.DEGREES_TO_FRACTION
  const isPercentStage = stage === 'percent'
  const percentHasFraction = isPercentStage && current.percent.fracNumerator != null
  const activeAnswer = isMainStage ? current?.answer : current?.percent.answer
  // A real fraction bar for the fraction stage, a mixed-number fraction bar
  // for the percent stage - never the plain "n/d" slash string.
  const activeDisplayAnswer = isMainStage
    ? showsFractionBoxes
      ? <FractionText numerator={current.fact.numerator} denominator={current.fact.denominator} />
      : current?.displayAnswer
    : <PercentText percent={current.percent} />
  // The given fraction ("1/4 = ") in the fraction->degrees direction, shown
  // as a real fraction bar instead of current.prefix's plain slash string.
  // The degrees->fraction direction has no fraction in its prefix, so it
  // can use current.prefix ("90° = ") as-is.
  const prefixDisplay = showsFractionBoxes ? (
    current.prefix
  ) : (
    <>
      <FractionText numerator={current.fact.numerator} denominator={current.fact.denominator} /> ={' '}
    </>
  )

  // The numerator box is done after this many digits, then typing jumps
  // straight into the denominator box — no separate "field focus" state
  // needed, it's derived purely from how many digits have been typed so far.
  // Once a stage is answered (right or wrong), its boxes switch from the
  // digits being typed to the correct answer, so a wrong guess doesn't just
  // sit there in red — the right fraction/percent is shown in its place.
  const mainDigits = isMainStage ? (feedback ? current.answer : input) : current.answer
  const numeratorLen = showsFractionBoxes ? String(current.fact.numerator).length : 0
  const numeratorDisplay = showsFractionBoxes ? mainDigits.slice(0, numeratorLen) : ''
  const denominatorDisplay = showsFractionBoxes ? mainDigits.slice(numeratorLen) : ''

  const wholeLen = isPercentStage ? String(current.percent.whole).length : 0
  const fracNumLen = percentHasFraction ? String(current.percent.fracNumerator).length : 0
  const percentDigits = isPercentStage ? (feedback ? current.percent.answer : input) : ''
  const wholeDisplay = isPercentStage ? percentDigits.slice(0, wholeLen) : ''
  const fracNumDisplay = percentHasFraction ? percentDigits.slice(wholeLen, wholeLen + fracNumLen) : ''
  const fracDenDisplay = percentHasFraction ? percentDigits.slice(wholeLen + fracNumLen) : ''

  useEffect(() => {
    inputRef.current?.focus()
  }, [current?.id, stage])

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
    // An empty submission (Enter/Backspace pressed on a blank field) always
    // counts as wrong instead of being ignored.
    const isCorrect = value.trim() !== '' && value === activeAnswer
    // Chain mode is a drilled, retry-until-correct practice run, not a
    // diagnostic pass — keep it out of the weak/strong progress-map stats.
    // Recorded under a stage-specific key so the progress map can color the
    // fraction and percent cells independently.
    if (!settings.inOrder) {
      recordFactResult(isMainStage ? fractionKey(question.fact.degrees) : percentKey(question.fact.degrees), isCorrect)
    }
    setFeedback(isCorrect ? 'correct' : 'wrong')
    if (isCorrect) vibrateSuccess()

    if (isMainStage) mainResultRef.current = { value, isCorrect }
    else percentResultRef.current = { value, isCorrect }

    // Chain mode ("לפי הסדר"): a wrong answer stops the chain in place — the
    // user picks "המשך מכאן" (retry) or "התחל מהתחלה" (restart) instead of
    // silently moving on to the next stage/question.
    if (settings.inOrder && !isCorrect) return

    if (!mainResultRef.current || !percentResultRef.current) {
      const nextStage = isMainStage ? 'percent' : 'main'
      setTimeout(() => {
        setStage(nextStage)
        inputValueRef.current = ''
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
          markFactLearned(fractionKey(question.fact.degrees))
          markFactLearned(percentKey(question.fact.degrees))
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
    setStage('main')
    mainResultRef.current = null
    percentResultRef.current = null

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
    mainResultRef.current = null
    percentResultRef.current = null
    startTimeRef.current = Date.now()
    setCorrectCount(0)
    setWrongCount(0)
    setResolvedIds(new Set())
    inputValueRef.current = ''
    setInput('')
    setFeedback(null)
    setStage('main')
    setQueue(questions)
  }

  const percentBoxes = (
    <div className="percent-input inline-percent">
      <div className={`fraction-box ${input.length < wholeLen ? 'active' : ''}`}>{wholeDisplay || ' '}</div>
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
  )

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
        <div className="question-text">
          {isMainStage ? (
            <>
              {prefixDisplay}
              {showsFractionBoxes ? (
                <div className="fraction-input inline-fraction">
                  <div className={`fraction-box ${input.length < numeratorLen ? 'active' : ''}`}>
                    {numeratorDisplay || ' '}
                  </div>
                  <div className="fraction-line" />
                  <div className={`fraction-box ${input.length >= numeratorLen ? 'active' : ''}`}>
                    {denominatorDisplay || ' '}
                  </div>
                </div>
              ) : (
                <>
                  <span className="answer-blank">{mainResultRef.current ? current.displayAnswer : ' '}</span>
                  {current.suffix}
                </>
              )}
            </>
          ) : showsFractionBoxes ? (
            // Degrees -> fraction direction: the confirmed fraction (right
            // or wrong, we always show the correct one) takes over the spot
            // the degrees prefix used to sit in, and percent takes over
            // where the fraction was - "90° = ___" becomes "1/4 = ___%".
            <>
              <FractionText numerator={current.fact.numerator} denominator={current.fact.denominator} />
              {current.suffix} ={' '}
              {percentBoxes}
            </>
          ) : (
            // Fraction -> degrees direction: the given fraction prefix
            // never moves - percent simply takes over the spot the degrees
            // answer used to sit in, in place - "1/4 = ___" becomes "1/4 = ___%".
            <>
              {prefixDisplay}
              {percentBoxes}
            </>
          )}
        </div>

        <form onSubmit={handleSubmit} className={(isMainStage && showsFractionBoxes) || isPercentStage ? 'fraction-form' : ''}>
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
            className={(isMainStage && showsFractionBoxes) || isPercentStage ? 'sr-only-input' : ''}
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
            לא נכון. התשובה הנכונה: {activeDisplayAnswer}
          </div>
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
