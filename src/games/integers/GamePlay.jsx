import { useMemo, useRef, useState } from 'react'
import { getRoundQuestions, questionFontSize, KEYPAD_TOKENS, LAWS } from './logic'
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

export default function GamePlay({ settings, onFinish, onExitQuiz }) {
  useHtmlClassLock('quant-gameplay-lock')
  const questions = useMemo(() => getRoundQuestions(settings), [settings])
  const [queue, setQueue] = useState(questions)
  const [feedback, setFeedback] = useState(null) // 'correct' | 'wrong' | null
  const [selectedKey, setSelectedKey] = useState(null)
  const [correctCount, setCorrectCount] = useState(0)
  const [wrongCount, setWrongCount] = useState(0)
  const [pressedKey, press] = useKeypadPress()
  const startTimeRef = useRef(Date.now())
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

  function submitAnswer(tokenKey) {
    if (feedback) return

    const question = current
    const isCorrect = tokenKey === question.answer
    setSelectedKey(tokenKey)
    setFeedback(isCorrect ? 'correct' : 'wrong')
    if (isCorrect) vibrateSuccess()

    const isFirstAttempt = !firstAttemptsRef.current.has(question.id)
    let requeue

    if (isFirstAttempt) {
      firstAttemptsRef.current.set(question.id, { question, userAnswer: tokenKey, isCorrect })
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
    setSelectedKey(null)
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
              <span className="answer-blank">{feedback ? current.answerDisplay : ' '}</span>
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
                className={`keypad-btn ${token.big ? 'keypad-sign-btn' : ''} ${stateClass} ${pressedKey === token.key ? 'pressed' : ''}`}
                onClick={() => {
                  press(token.key)
                  submitAnswer(token.key)
                }}
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
