import { useState } from 'react'
import { nextQuestion, DIVISORS } from './logic'
import { recordDivisorResult, recordStreakIfBest } from './stats'
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

// Endless mode: one number after another forever, no round to finish and no
// results screen - only "יציאה מהתרגול" ever stops it. The streak counts
// whole numbers solved with zero wrong taps, not individual correct taps
// (there are several correct divisors per number, and those shouldn't each
// bump the count) - a wrong tap resets it immediately, the same instant it
// happens, rather than waiting for the number to finish.
export default function GamePlay({ onExitQuiz }) {
  useHtmlClassLock('quant-gameplay-lock')
  const [current, setCurrent] = useState(() => nextQuestion())
  const [found, setFound] = useState(() => new Set())
  const [wrong, setWrong] = useState(() => new Set())
  const [advancing, setAdvancing] = useState(false)
  const [streak, setStreak] = useState(0)
  const [pressedKey, press] = useKeypadPress()

  function pressDivisor(n) {
    if (advancing || found.has(n) || wrong.has(n)) return

    const isRight = current.divisors.includes(n)
    recordDivisorResult(n, isRight)

    if (!isRight) {
      setWrong((prev) => new Set(prev).add(n))
      setStreak(0)
      return
    }

    vibrateSuccess()
    const nextFound = new Set(found).add(n)
    setFound(nextFound)

    if (nextFound.size < current.divisors.length) return

    // Every real divisor of the current number has now been tapped
    // correctly - this number is done. Only a mistake-free pass extends
    // the streak; one that had a wrong tap already reset it to 0 above.
    if (wrong.size === 0) {
      setStreak((s) => {
        const next = s + 1
        recordStreakIfBest(next)
        return next
      })
    }
    setAdvancing(true)
    setTimeout(() => {
      setCurrent(nextQuestion(current.value))
      setFound(new Set())
      setWrong(new Set())
      setAdvancing(false)
    }, ADVANCE_DELAY_MS)
  }

  return (
    <div className="gameplay">
      <div className="wizard-topbar">
        <button className="icon-back-btn" onClick={onExitQuiz} aria-label="יציאה מהתרגול">
          →
        </button>
      </div>

      <div className="division-streak-row">
        <span className="division-streak-label">רצף</span>
        <span className="division-streak-value">{streak}</span>
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
