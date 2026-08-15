import { useEffect, useRef, useState } from 'react'
import { wordsMatch } from './logic'
import { vibrateSuccess } from '../../utils/haptics'
import { recordSynonymResult } from './stats'

export default function SynonymsPlay({ sets, onFinish, onExitQuiz }) {
  const questions = sets
  const [qIndex, setQIndex] = useState(0)
  const [filledIds, setFilledIds] = useState(new Set())
  // Slots filled by giving up (empty Enter/Backspace) rather than a correct
  // guess - shown red instead of green, since the user didn't actually know it.
  const [revealedIds, setRevealedIds] = useState(new Set())
  const [input, setInput] = useState('')
  const [wrongFlash, setWrongFlash] = useState(false)
  const [correctTotal, setCorrectTotal] = useState(0)
  const [wrongTotal, setWrongTotal] = useState(0)
  const startTimeRef = useRef(Date.now())
  const inputRef = useRef(null)
  // Whether the current word had any wrong/given-up guess since it was last
  // reset (either by moving to a new word or by "נסה שוב") — a word only
  // counts as mastered, and only advances to the next one, once it's been
  // filled with this at false the whole way through.
  const [wordHasMistake, setWordHasMistake] = useState(false)

  const current = questions[qIndex]
  const allFilled = filledIds.size === current.synonyms.length
  const wordSucceeded = allFilled && !wordHasMistake
  const wordFailed = allFilled && wordHasMistake
  const progressPercent = Math.round((qIndex / questions.length) * 100)

  useEffect(() => {
    if (!allFilled) inputRef.current?.focus()
  }, [qIndex, allFilled])

  useEffect(() => {
    if (wrongFlash) {
      const t = setTimeout(() => setWrongFlash(false), 500)
      return () => clearTimeout(t)
    }
  }, [wrongFlash])

  // Lock the whole page to one screen for the duration of the quiz, same as
  // the vocabulary quiz — see GamePlay.jsx's identical effect for the full
  // rationale (iOS keyboard-pan cancelling + --app-vh sizing off
  // window.innerHeight instead of visualViewport.height).
  useEffect(() => {
    const root = document.documentElement
    const body = document.body
    root.classList.add('vocab-quiz-lock')
    body.classList.add('vocab-quiz-lock')

    function syncHeight() {
      root.style.setProperty('--app-vh', `${window.innerHeight}px`)
    }
    syncHeight()
    window.addEventListener('resize', syncHeight)

    const vv = window.visualViewport
    function cancelPan() {
      window.scrollTo(0, 0)
    }
    vv?.addEventListener('resize', cancelPan)
    vv?.addEventListener('scroll', cancelPan)

    return () => {
      root.classList.remove('vocab-quiz-lock')
      body.classList.remove('vocab-quiz-lock')
      root.style.removeProperty('--app-vh')
      window.removeEventListener('resize', syncHeight)
      vv?.removeEventListener('resize', cancelPan)
      vv?.removeEventListener('scroll', cancelPan)
    }
  }, [])

  // Once a word is fully filled (whether the pass was clean or had
  // mistakes), Enter always redoes the same word from scratch and Tab
  // always advances to the next one - lets the user re-drill a word they
  // just got right, not just recover from a wrong one.
  useEffect(() => {
    function onKeyDown(e) {
      if (e.target.closest('button')) return
      if (!allFilled) return
      if (e.key === 'Enter') {
        e.preventDefault()
        retryWord()
      } else if (e.key === 'Tab') {
        e.preventDefault()
        goNext()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  })

  function handleSubmit(e) {
    e.preventDefault()
    if (allFilled) return
    if (input.trim() === '') {
      giveUpOnSlot()
      return
    }

    const match = current.synonyms.find((syn) => !filledIds.has(syn.id) && wordsMatch(input, syn.text))
    if (match) {
      setFilledIds((prev) => new Set(prev).add(match.id))
      setCorrectTotal((c) => c + 1)
      setInput('')
      vibrateSuccess()
      recordSynonymResult(match.id, true)
    } else {
      setWrongTotal((c) => c + 1)
      setWrongFlash(true)
      setInput('')
      setWordHasMistake(true)
    }
  }

  // Submitting an empty field (Enter) or pressing Backspace while it's
  // already empty means "I don't know" — same convention as the quant
  // quizzes' empty-field auto-submit: counts as a wrong guess and reveals
  // one of the still-missing synonyms instead of silently doing nothing.
  function giveUpOnSlot() {
    const remaining = current.synonyms.find((syn) => !filledIds.has(syn.id))
    if (!remaining) return
    setFilledIds((prev) => new Set(prev).add(remaining.id))
    setRevealedIds((prev) => new Set(prev).add(remaining.id))
    setWrongTotal((c) => c + 1)
    setWrongFlash(true)
    setInput('')
    setWordHasMistake(true)
    recordSynonymResult(remaining.id, false)
  }

  // Clears the current word back to empty so it can be typed again from
  // scratch - used both to recover from a pass with mistakes and, via
  // Enter/the "נסה שוב" button, to voluntarily re-drill a word already
  // gotten right.
  function retryWord() {
    setFilledIds(new Set())
    setRevealedIds(new Set())
    setWordHasMistake(false)
    setInput('')
  }

  function goNext() {
    if (qIndex + 1 < questions.length) {
      setQIndex((i) => i + 1)
      setFilledIds(new Set())
      setRevealedIds(new Set())
      setWordHasMistake(false)
      setInput('')
    } else {
      onFinish({ correctTotal, wrongTotal, elapsedMs: Date.now() - startTimeRef.current, totalWords: questions.length })
    }
  }

  return (
    <div className="gameplay vocab-gameplay">
      <div className="wizard-topbar">
        <button className="icon-back-btn" onClick={onExitQuiz} aria-label="יציאה מהתרגול">
          →
        </button>
      </div>

      <div className="quiz-progress">
        <div className="quiz-progress-row">
          <span>
            {qIndex + 1} / {questions.length}
          </span>
          <span className="quiz-progress-score">
            <span className="correct">✔︎ {correctTotal}</span>
            <span className="wrong">✘ {wrongTotal}</span>
          </span>
        </div>
        <div className="quiz-progress-track">
          <div className="quiz-progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <div className={`question-card ${wrongFlash || wordFailed ? 'wrong' : ''} ${wordSucceeded ? 'correct' : ''}`}>
        <div className="question-text vocab-word">{current.word}</div>

        <ol className="synonym-slots">
          {current.synonyms.map((syn, i) => {
            const filled = filledIds.has(syn.id)
            const revealed = revealedIds.has(syn.id)
            return (
              <li key={syn.id} className={`synonym-slot ${filled ? (revealed ? 'revealed' : 'filled') : ''}`}>
                <span className="synonym-slot-num">{i + 1}.</span>
                <span className="synonym-slot-text">{filled ? syn.text : '. . . . .'}</span>
              </li>
            )
          })}
        </ol>

        {!allFilled && (
          <form onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Backspace' && input === '') {
                  e.preventDefault()
                  giveUpOnSlot()
                }
              }}
              placeholder="מילה נרדפת בשפה גבוהה"
              autoFocus
            />
            <button type="submit" className="primary-btn">
              בדוק
            </button>
          </form>
        )}

        {wordSucceeded && (
          <div className="vocab-reveal">
            <div className="feedback-msg correct">כל המילים הנרדפות נמצאו! ✔</div>
            <div className="vocab-edit-form-actions">
              <button className="primary-btn vocab-next-btn" onClick={goNext}>
                {qIndex + 1 < questions.length ? 'למילה הבאה' : 'סיום'}
              </button>
              <button className="secondary-btn" onClick={retryWord}>
                נסה שוב
              </button>
            </div>
          </div>
        )}

        {wordFailed && (
          <div className="vocab-reveal">
            <div className="feedback-msg wrong">היו טעויות במילה הזו - צריך לכתוב את כל המילים הנרדפות שוב</div>
            <button className="primary-btn vocab-next-btn" onClick={retryWord}>
              נסה שוב
            </button>
          </div>
        )}
      </div>

      {allFilled && (
        <button
          type="button"
          className="next-word-fab"
          onClick={wordSucceeded ? goNext : retryWord}
          title={wordSucceeded ? 'למילה הבאה' : 'נסה שוב'}
        >
          {wordSucceeded ? (qIndex + 1 < questions.length ? 'הבא' : 'סיום') : 'נסה שוב'}
        </button>
      )}
    </div>
  )
}
