import { useEffect, useMemo, useRef, useState } from 'react'
import { generateOctagonAreaRound, checkFormulaAnswer } from './logic'
import { vibrateSuccess } from '../../utils/haptics'
import { useHtmlClassLock } from '../../utils/useHtmlClassLock'
import PolygonShape from './PolygonShape'
import OctagonAreaDiagram from './OctagonAreaDiagram'

// Free-text answers are longer to read than a number, so feedback lingers
// a bit longer than the numeric quizzes' 900ms before auto-advancing.
const FEEDBACK_DELAY_MS = 1600
// Same buffered-retry rules as the rest of the polygons quiz: a wrong
// answer resurfaces a few questions later and needs two correct passes in
// a row before it's considered learned.
const RETRY_BUFFER = 5
const RETRY_PASSES_NEEDED = 2

export default function OctagonAreaGamePlay({ settings, onFinish, onExitQuiz }) {
  useHtmlClassLock('quant-gameplay-lock')
  const questions = useMemo(() => generateOctagonAreaRound(settings), [settings])
  const [queue, setQueue] = useState(questions)
  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useState(null) // 'correct' | 'wrong' | null
  const [correctCount, setCorrectCount] = useState(0)
  const [wrongCount, setWrongCount] = useState(0)
  const startTimeRef = useRef(Date.now())
  const inputRef = useRef(null)
  const firstAttemptsRef = useRef(new Map())
  const retryPassesRef = useRef(new Map())

  const current = queue[0]
  const totalQuestions = questions.length
  const progressPercent = Math.round((correctCount / totalQuestions) * 100)

  useEffect(() => {
    inputRef.current?.focus()
  }, [current?.id])

  function handleSubmit(e) {
    e.preventDefault()
    submitAnswer(input)
  }

  function submitAnswer(value) {
    if (feedback || value.trim() === '') return

    const question = current
    const isCorrect = checkFormulaAnswer(value, question.answers)
    setFeedback(isCorrect ? 'correct' : 'wrong')
    if (isCorrect) vibrateSuccess()

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
    setInput('')
    setFeedback(null)

    if (rest.length === 0) {
      const finalAnswers = questions.map((q) => firstAttemptsRef.current.get(q.id)).filter(Boolean)
      onFinish({ answers: finalAnswers, elapsedMs: Date.now() - startTimeRef.current })
      return
    }
    setQueue(rest)
  }

  if (!current) return null

  const highlight = current.kind === 'part' ? current.key : null

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

      <div className={`question-card octagon-area-card ${feedback ?? ''}`}>
        <div className="octagon-area-diagram-wrap">
          {highlight ? <OctagonAreaDiagram highlight={highlight} /> : <PolygonShape sides={8} size={120} />}
        </div>

        <div className="octagon-area-prompt">{current.prompt}</div>

        <form onSubmit={handleSubmit} className="octagon-area-form">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!!feedback}
            placeholder="הקלד/י את התשובה במילים"
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
          />
          <button type="submit" className="primary-btn" disabled={!!feedback || input.trim() === ''}>
            בדוק
          </button>
        </form>

        {feedback === 'correct' && <div className="feedback-msg correct">כל הכבוד! נכון ✔</div>}
        {feedback === 'wrong' && (
          <div className="feedback-msg wrong">
            לא נכון. התשובה הנכונה: <span className="octagon-area-formula">{current.display}</span>
          </div>
        )}
      </div>
    </div>
  )
}
