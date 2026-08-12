import { useMemo, useRef, useState } from 'react'
import { generateRound, DIVISORS } from './logic'
import { recordDivisorResult } from './stats'
import { vibrateSuccess } from '../../utils/haptics'
import { useKeypadPress } from '../../utils/useKeypadPress'
import { useHtmlClassLock } from '../../utils/useHtmlClassLock'

// No "בדוק" button - every tap resolves immediately (the tapped digit turns
// green or red on the spot), so the only pause is this short beat once the
// last correct digit for the current number lands, before the next number
// takes over.
const ADVANCE_DELAY_MS = 700

// Shaped like the other quant quizzes' 1-9 numeric keypad (same
// .numeric-keypad/.keypad-btn) so the keys land in the same familiar spot;
// 1 and 7 have no divisibility rule in this quiz, so they render as
// permanently disabled placeholders instead of being skipped and shifting
// every other digit out of its usual position. 10 and 11 (not single
// digits) get a 4th row of their own.
const KEYPAD_SLOTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]

export default function GamePlay({ settings, onFinish, onExitQuiz }) {
  useHtmlClassLock('quant-gameplay-lock')
  const initialQuestions = useMemo(() => generateRound(settings), [settings])
  const [queue, setQueue] = useState(initialQuestions)
  const [found, setFound] = useState(() => new Set())
  const [wrong, setWrong] = useState(() => new Set())
  const [advancing, setAdvancing] = useState(false)
  const [answers, setAnswers] = useState([])
  const [pressedKey, press] = useKeypadPress()
  const startTimeRef = useRef(Date.now())

  const current = queue[0]
  const total = initialQuestions.length
  const correctCount = answers.filter((a) => a.isCorrect).length
  const wrongCount = answers.filter((a) => !a.isCorrect).length
  const progressPercent = Math.round((answers.length / total) * 100)

  function pressDivisor(n) {
    if (advancing || found.has(n) || wrong.has(n)) return

    const isRight = current.divisors.includes(n)
    recordDivisorResult(n, isRight)

    if (!isRight) {
      setWrong((prev) => new Set(prev).add(n))
      return
    }

    vibrateSuccess()
    const nextFound = new Set(found).add(n)
    setFound(nextFound)

    if (nextFound.size < current.divisors.length) return

    // Every real divisor of the current number has now been tapped
    // correctly - this question is done, with a mistake-free pass only if
    // nothing was ever tapped wrong along the way.
    const nextAnswers = [...answers, { question: current, isCorrect: wrong.size === 0 }]
    setAnswers(nextAnswers)
    setAdvancing(true)
    setTimeout(() => {
      const rest = queue.slice(1)
      setFound(new Set())
      setWrong(new Set())
      setAdvancing(false)
      if (rest.length === 0) {
        onFinish({ answers: nextAnswers, elapsedMs: Date.now() - startTimeRef.current })
        return
      }
      setQueue(rest)
    }, ADVANCE_DELAY_MS)
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
          <span>{answers.length} / {total}</span>
          <span className="quiz-progress-score">
            <span className="correct">✔︎ {correctCount}</span>
            <span className="wrong">✘ {wrongCount}</span>
          </span>
        </div>
        <div className="quiz-progress-track">
          <div className="quiz-progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <div className={`question-card ${advancing ? 'correct' : ''}`}>
        <div className="question-text division-question-text">{current.value}</div>
        <p className="division-prompt">באילו מהספרות הבאות המספר מתחלק?</p>

        <div className="numeric-keypad division-keypad">
          {KEYPAD_SLOTS.map((n) => {
            if (!DIVISORS.includes(n)) {
              return (
                <button key={n} type="button" className="keypad-btn" disabled>
                  {n}
                </button>
              )
            }
            const key = String(n)
            return (
              <button
                key={n}
                type="button"
                className={`keypad-btn ${found.has(n) ? 'divisor-found' : ''} ${wrong.has(n) ? 'divisor-wrong' : ''} ${
                  pressedKey === key ? 'pressed' : ''
                }`}
                onClick={() => {
                  press(key)
                  pressDivisor(n)
                }}
                disabled={advancing || found.has(n) || wrong.has(n)}
              >
                {n}
              </button>
            )
          })}
        </div>

        {advancing && <div className="feedback-msg correct">כל הכבוד! נכון ✔</div>}
      </div>
    </div>
  )
}
