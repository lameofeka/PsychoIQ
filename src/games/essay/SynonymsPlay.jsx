import { useEffect, useRef, useState } from 'react'
import { wordsMatch } from './logic'
import { vibrateSuccess } from '../../utils/haptics'
import { recordSynonymSetResult } from './stats'

export default function SynonymsPlay({ sets, onFinish, onExitQuiz }) {
  const questions = sets
  const [qIndex, setQIndex] = useState(0)
  const [filledIds, setFilledIds] = useState(new Set())
  const [input, setInput] = useState('')
  const [wrongFlash, setWrongFlash] = useState(false)
  const [correctTotal, setCorrectTotal] = useState(0)
  const [wrongTotal, setWrongTotal] = useState(0)
  const startTimeRef = useRef(Date.now())
  const inputRef = useRef(null)
  // Tracks whether the current word had any wrong/given-up guess this round,
  // so goNext can record one pass/fail result per word for the progress map
  // — reset whenever qIndex moves to a new word.
  const wordMistakeRef = useRef(false)

  const current = questions[qIndex]
  const wordDone = filledIds.size === current.synonyms.length
  const progressPercent = Math.round((qIndex / questions.length) * 100)

  useEffect(() => {
    if (!wordDone) inputRef.current?.focus()
  }, [qIndex, wordDone])

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

  useEffect(() => {
    function onKeyDown(e) {
      if (e.target.closest('button')) return
      if (wordDone && e.key === 'Enter') {
        e.preventDefault()
        goNext()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  })

  function handleSubmit(e) {
    e.preventDefault()
    if (wordDone) return
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
    } else {
      setWrongTotal((c) => c + 1)
      setWrongFlash(true)
      setInput('')
      wordMistakeRef.current = true
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
    setWrongTotal((c) => c + 1)
    setWrongFlash(true)
    setInput('')
    wordMistakeRef.current = true
  }

  function goNext() {
    recordSynonymSetResult(current.id, !wordMistakeRef.current)
    wordMistakeRef.current = false
    if (qIndex + 1 < questions.length) {
      setQIndex((i) => i + 1)
      setFilledIds(new Set())
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

      <div className={`question-card ${wrongFlash ? 'wrong' : ''} ${wordDone ? 'correct' : ''}`}>
        <div className="question-text vocab-word">{current.word}</div>

        <ol className="synonym-slots">
          {current.synonyms.map((syn, i) => (
            <li key={syn.id} className={`synonym-slot ${filledIds.has(syn.id) ? 'filled' : ''}`}>
              <span className="synonym-slot-num">{i + 1}.</span>
              <span className="synonym-slot-text">{filledIds.has(syn.id) ? syn.text : '. . . . .'}</span>
            </li>
          ))}
        </ol>

        {!wordDone && (
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

        {wordDone && (
          <div className="vocab-reveal">
            <div className="feedback-msg correct">כל המילים הנרדפות נמצאו! ✔</div>
            <button className="primary-btn vocab-next-btn" onClick={goNext}>
              {qIndex + 1 < questions.length ? 'למילה הבאה' : 'סיום'}
            </button>
          </div>
        )}
      </div>

      {wordDone && (
        <button type="button" className="next-word-fab" onClick={goNext} title="למילה הבאה">
          {qIndex + 1 < questions.length ? 'הבא' : 'סיום'}
        </button>
      )}
    </div>
  )
}
