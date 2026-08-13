import { useState } from 'react'
import { nextQuestion, DIVISORS } from './logic'
import { recordDivisorResult, recordStreakIfBest } from './stats'
import { vibrateSuccess } from '../../utils/haptics'
import { useKeypadPress } from '../../utils/useKeypadPress'
import { useHtmlClassLock } from '../../utils/useHtmlClassLock'

// Reveal pause after "הגשה" - long enough to read all three possible
// indicators (found/wrong/missed) across the whole keypad before the next
// number takes over.
const REVEAL_DELAY_MS = 1400

// Shaped like the other quant quizzes' 1-9 numeric keypad (same
// .numeric-keypad/.keypad-btn) so the keys land in the same familiar spot;
// 1 and 7 have no divisibility rule in this quiz, so they render as
// permanently disabled placeholders instead of being skipped and shifting
// every other digit out of its usual position. 10 and 11 (not single
// digits) get a 4th row of their own, alongside the submit button.
const KEYPAD_SLOTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 'submit']

// Endless mode: one number after another forever, no round to finish and no
// results screen - only "יציאה מהתרגול" ever stops it. The learner marks
// every digit they believe divides the number, then presses the purple
// checkmark to grade the whole set at once (see .divisor-found/
// .divisor-wrong/.divisor-missed below). The streak counts whole numbers
// solved with a perfect submission - the marked set exactly matching the
// real divisors - reset to 0 the instant a submission isn't perfect.
export default function GamePlay({ onExitQuiz }) {
  useHtmlClassLock('quant-gameplay-lock')
  const [current, setCurrent] = useState(() => nextQuestion())
  const [selected, setSelected] = useState(() => new Set())
  const [revealed, setRevealed] = useState(false)
  const [lastPerfect, setLastPerfect] = useState(false)
  const [streak, setStreak] = useState(0)
  const [pressedKey, press] = useKeypadPress()

  function toggleDivisor(n) {
    if (revealed) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(n)) next.delete(n)
      else next.add(n)
      return next
    })
  }

  function submitAnswer() {
    if (revealed) return

    const correctSet = new Set(current.divisors)
    let perfect = true
    for (const n of DIVISORS) {
      const isCorrect = selected.has(n) === correctSet.has(n)
      if (!isCorrect) perfect = false
      recordDivisorResult(n, isCorrect)
    }

    setLastPerfect(perfect)
    if (perfect) {
      vibrateSuccess()
      setStreak((s) => {
        const next = s + 1
        recordStreakIfBest(next)
        return next
      })
    } else {
      setStreak(0)
    }

    setRevealed(true)
    setTimeout(() => {
      setCurrent(nextQuestion(current.value))
      setSelected(new Set())
      setRevealed(false)
    }, REVEAL_DELAY_MS)
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

      <div className={`question-card ${revealed ? (lastPerfect ? 'correct' : 'wrong') : ''}`}>
        <div className="question-text division-question-text">{current.value}</div>
        <p className="division-prompt">באילו מהספרות הבאות המספר מתחלק?</p>

        <div className="numeric-keypad division-keypad">
          {KEYPAD_SLOTS.map((slot) => {
            if (slot === 'submit') {
              return (
                <button
                  key="submit"
                  type="button"
                  className={`keypad-btn keypad-action division-submit-btn ${
                    pressedKey === 'submit' ? 'pressed' : ''
                  }`}
                  onClick={() => {
                    press('submit')
                    submitAnswer()
                  }}
                  disabled={revealed}
                  aria-label="הגשת תשובה"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </button>
              )
            }

            const n = slot
            if (!DIVISORS.includes(n)) {
              return (
                <button key={n} type="button" className="keypad-btn" disabled>
                  {n}
                </button>
              )
            }

            const key = String(n)
            const isSelected = selected.has(n)
            const isDivisor = current.divisors.includes(n)
            let stateClass = ''
            if (revealed) {
              if (isSelected && isDivisor) stateClass = 'divisor-found'
              else if (isSelected && !isDivisor) stateClass = 'divisor-wrong'
              else if (!isSelected && isDivisor) stateClass = 'divisor-missed'
            } else if (isSelected) {
              stateClass = 'divisor-selected'
            }

            return (
              <button
                key={n}
                type="button"
                className={`keypad-btn ${stateClass} ${pressedKey === key ? 'pressed' : ''}`}
                onClick={() => {
                  press(key)
                  toggleDivisor(n)
                }}
                disabled={revealed}
              >
                {n}
              </button>
            )
          })}
        </div>

        {revealed && (
          <div className={`feedback-msg ${lastPerfect ? 'correct' : 'wrong'}`}>
            {lastPerfect ? 'כל הכבוד! נכון ✔' : 'לא מדויק - שימו לב לספרות המסומנות'}
          </div>
        )}
      </div>
    </div>
  )
}
