import { useEffect, useMemo, useRef, useState } from 'react'
import { generateRound, DIVISORS } from './logic'
import { recordDivisorResult } from './stats'
import { vibrateSuccess } from '../../utils/haptics'
import { useHtmlClassLock } from '../../utils/useHtmlClassLock'

const FEEDBACK_DELAY_MS = 1600
const CORRECT_FLASH_MS = 800
const RETRY_BUFFER = 3

export default function GamePlay({ settings, onFinish, onExitQuiz }) {
  useHtmlClassLock('quant-gameplay-lock')
  const initialQuestions = useMemo(() => generateRound(settings), [settings])
  const [queue, setQueue] = useState(initialQuestions)
  const [selected, setSelected] = useState(() => new Set())
  const [feedback, setFeedback] = useState(null) // 'correct' | 'wrong' | null
  const [correctFlash, setCorrectFlash] = useState(false)
  const [firstAttempts, setFirstAttempts] = useState(() => new Map())
  const [resolvedIds, setResolvedIds] = useState(() => new Set())
  const startTimeRef = useRef(Date.now())

  const current = queue[0]
  const total = initialQuestions.length
  const correctCount = [...firstAttempts.values()].filter((a) => a.isCorrect).length
  const wrongCount = [...firstAttempts.values()].filter((a) => !a.isCorrect).length
  const progressPercent = Math.round((resolvedIds.size / total) * 100)
  const actual = useMemo(() => new Set(current?.divisors ?? []), [current])

  useEffect(() => {
    if (feedback) return
    function onKeyDown(e) {
      if (e.target.closest('button')) return
      if (e.key === 'Enter') {
        e.preventDefault()
        submitAnswer()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  })

  function toggleDivisor(n) {
    if (feedback) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(n)) next.delete(n)
      else next.add(n)
      return next
    })
  }

  function submitAnswer() {
    if (feedback) return

    const question = current
    let allMatch = true
    for (const n of DIVISORS) {
      const isRight = selected.has(n) === actual.has(n)
      if (!isRight) allMatch = false
      recordDivisorResult(n, isRight)
    }

    const isFirstAttempt = !firstAttempts.has(question.id)
    const nextFirstAttempts = isFirstAttempt
      ? new Map(firstAttempts).set(question.id, { question, selected: new Set(selected), isCorrect: allMatch })
      : firstAttempts
    if (isFirstAttempt) setFirstAttempts(nextFirstAttempts)

    // Correct answers advance immediately (correctFlash is a non-blocking
    // "כל הכבוד" flash, not a pause) — only a wrong answer stops to reveal
    // which divisors were marked incorrectly.
    if (allMatch) {
      vibrateSuccess()
      setCorrectFlash(true)
      setTimeout(() => setCorrectFlash(false), CORRECT_FLASH_MS)
      setResolvedIds((prev) => new Set(prev).add(question.id))
      const rest = queue.slice(1)
      setSelected(new Set())
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
      setSelected(new Set())
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
        <div className="question-text division-question-text">{current.value}</div>
        <p className="division-prompt">באילו מהספרות הבאות המספר מתחלק?</p>

        <div className="divisor-grid">
          {DIVISORS.map((n) => {
            const isSelected = selected.has(n)
            const isActual = feedback === 'wrong' && actual.has(n)
            const isMistake = feedback === 'wrong' && isSelected !== actual.has(n)
            return (
              <button
                key={n}
                type="button"
                className={`divisor-chip ${isSelected ? 'selected' : ''} ${isActual ? 'actual' : ''} ${isMistake ? 'mistake' : ''}`}
                onClick={() => toggleDivisor(n)}
                disabled={!!feedback}
              >
                {n}
              </button>
            )
          })}
        </div>

        <button className="primary-btn division-submit-btn" onClick={submitAnswer} disabled={!!feedback}>
          בדוק
        </button>

        {correctFlash && <div className="feedback-msg correct">כל הכבוד! נכון ✔</div>}
        {feedback === 'wrong' && (
          <div className="feedback-msg wrong">
            לא נכון. {current.value} מתחלק ב: {current.divisors.length > 0 ? current.divisors.join(', ') : 'אף אחת מהספרות'}
          </div>
        )}
      </div>
    </div>
  )
}
