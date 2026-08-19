import { useMemo, useRef, useState } from 'react'
import { getRoundQuestions, questionFontSize, KEYPAD_TOKENS, LAWS } from './logic'
import {
  recordLawResult,
  recordFractionRowResult,
  markFractionRowLearned,
  recordProductFactResult,
  markProductFactLearned,
} from './stats'
import { FractionText } from '../circleParts/FractionText'
import { vibrateSuccess } from '../../utils/haptics'
import { useKeypadPress } from '../../utils/useKeypadPress'
import { useHtmlClassLock } from '../../utils/useHtmlClassLock'

const FEEDBACK_DELAY_MS = 900
// Same buffered-retry rules as the other quant quizzes: a wrong answer
// resurfaces a few questions later, and has to be answered correctly twice
// in a row before it's considered learned.
const RETRY_BUFFER = 5
const RETRY_PASSES_NEEDED = 2

// The only numeric answer that's more than one digit is 24 (law 4's "4
// עוקבים" fact) - typed as "2" then "4" via the digit buttons, same
// fail-fast-prefix pattern as primes' appendDigit. plus/minus/even/odd are
// never part of a multi-token answer, so they always submit on a single tap.
const DIGIT_KEYS = new Set(['2', '3', '4', '6', '8'])

export default function GamePlay({ settings, onFinish, onExitQuiz }) {
  useHtmlClassLock('quant-gameplay-lock')
  const questions = useMemo(() => getRoundQuestions(settings), [settings])
  const [queue, setQueue] = useState(questions)
  const [feedback, setFeedback] = useState(null) // 'correct' | 'wrong' | null
  const [selectedKey, setSelectedKey] = useState(null)
  const [input, setInput] = useState('')
  const [correctCount, setCorrectCount] = useState(0)
  const [wrongCount, setWrongCount] = useState(0)
  const [pressedKey, press] = useKeypadPress()
  const startTimeRef = useRef(Date.now())
  // Mirrors `input` synchronously, same reason as every other quant quiz's
  // GamePlay.jsx: a fast double-tap can otherwise land on a stale closure.
  const inputValueRef = useRef('')
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

  function pressToken(token) {
    if (feedback) return
    press(token.key)
    // Which single button lights up green/red - always the last one
    // physically pressed, even when the submitted value ends up being a
    // 2-digit accumulation (e.g. "4" lights up after completing "24").
    setSelectedKey(token.key)
    if (!DIGIT_KEYS.has(token.key)) {
      submitAnswer(token.key)
      return
    }
    const next = inputValueRef.current + token.key
    inputValueRef.current = next
    setInput(next)
    const answer = String(current.answer)
    // Fail fast: submit the moment the typed digits can no longer be a
    // prefix of the answer (e.g. typing "3" when the answer is "24"),
    // instead of waiting for a second digit that could never help.
    if (!answer.startsWith(next) || next.length >= answer.length) {
      submitAnswer(next)
    }
  }

  function submitAnswer(value) {
    if (feedback) return

    const question = current
    const isCorrect = value === question.answer
    setFeedback(isCorrect ? 'correct' : 'wrong')
    if (isCorrect) vibrateSuccess()

    // Laws 1/2 have no fixed fact to key on (see stats.js) - only the law
    // itself gets a rolling window. Laws 3/4 are fixed fact sets, so each
    // row/fact tracks its own window, same as every other quant quiz.
    if (question.law === LAWS.SIGN || question.law === LAWS.PARITY) {
      recordLawResult(question.law, isCorrect)
    } else if (question.law === LAWS.FRACTION) {
      recordFractionRowResult(question.rowIndex, isCorrect)
    } else if (question.law === LAWS.PRODUCTS) {
      recordProductFactResult(question.factIndex, isCorrect)
    }

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
          // Force the progress-map row/fact green right away instead of
          // waiting for the rolling window to dilute back up (see point 13
          // in the quant-quiz-conventions memory) - the retry queue itself
          // just decided this exact row/fact is learned.
          if (question.law === LAWS.FRACTION) markFractionRowLearned(question.rowIndex)
          else if (question.law === LAWS.PRODUCTS) markProductFactLearned(question.factIndex)
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
    setSelectedKey(null)
    setFeedback(null)
    inputValueRef.current = ''
    setInput('')

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
        <div
          className="question-text integers-question-text"
          style={{ direction: current.law === LAWS.SIGN ? 'ltr' : 'rtl', fontSize: questionFontSize(current) }}
        >
          {current.law === LAWS.FRACTION ? (
            <>
              <FractionText
                numerator={current.fracNumerator ?? <span className="frac-blank">{feedback ? current.answerDisplay : ' '}</span>}
                denominator={current.fracDenominator ?? <span className="frac-blank">{feedback ? current.answerDisplay : ' '}</span>}
              />
              {' = '}
              {current.resultText}
            </>
          ) : (
            <>
              {current.before}
              <span className="answer-blank">{feedback ? current.answerDisplay : input || ' '}</span>
              {current.after}
            </>
          )}
        </div>

        <div className="numeric-keypad integers-keypad">
          {KEYPAD_TOKENS.map((token) => {
            let stateClass = ''
            if (feedback && selectedKey === token.key) {
              stateClass = feedback === 'correct' ? 'divisor-found' : 'divisor-wrong'
            }
            return (
              <button
                key={token.key}
                type="button"
                className={`keypad-btn ${token.short ? 'keypad-short-btn' : ''} ${stateClass} ${pressedKey === token.key ? 'pressed' : ''}`}
                onClick={() => pressToken(token)}
                disabled={!!feedback}
              >
                {token.label}
              </button>
            )
          })}
        </div>

        {feedback === 'correct' && <div className="feedback-msg correct">כל הכבוד! נכון ✔</div>}
        {feedback === 'wrong' && (
          <div className="feedback-msg wrong">
            לא נכון. התשובה הנכונה: {current.answerDisplay}
          </div>
        )}
      </div>
    </div>
  )
}
