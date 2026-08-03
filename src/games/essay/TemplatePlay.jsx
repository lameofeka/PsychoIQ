import { useEffect, useRef, useState } from 'react'
import { sentencesMatch } from './logic'

export default function TemplatePlay({ sentences, onFinish, onExitQuiz }) {
  const [index, setIndex] = useState(0)
  const [input, setInput] = useState('')
  const [status, setStatus] = useState('typing') // 'typing' | 'broken'
  const [brokenInput, setBrokenInput] = useState('')
  const [mistakeCount, setMistakeCount] = useState(0)
  const startTimeRef = useRef(Date.now())
  const inputRef = useRef(null)

  const total = sentences.length
  const current = sentences[index]
  const progressPercent = Math.round((index / total) * 100)

  useEffect(() => {
    if (status === 'typing') inputRef.current?.focus()
  }, [index, status])

  useEffect(() => {
    function onKeyDown(e) {
      if (status !== 'broken') return
      if (e.key === 'Enter') {
        e.preventDefault()
        retryFromHere()
      } else if (e.key === 'Tab') {
        e.preventDefault()
        restartFromStart()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  })

  function handleSubmit(e) {
    e.preventDefault()
    if (status === 'broken' || input.trim() === '') return

    if (sentencesMatch(input, current.text)) {
      if (index + 1 < total) {
        setIndex((i) => i + 1)
        setInput('')
      } else {
        onFinish({ mistakeCount, elapsedMs: Date.now() - startTimeRef.current, total })
      }
    } else {
      setBrokenInput(input)
      setMistakeCount((c) => c + 1)
      setStatus('broken')
    }
  }

  function retryFromHere() {
    setInput('')
    setBrokenInput('')
    setStatus('typing')
  }

  function restartFromStart() {
    setIndex(0)
    setInput('')
    setBrokenInput('')
    setMistakeCount(0)
    setStatus('typing')
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
          <span>
            משפט {index + 1} / {total}
          </span>
          <span className="quiz-progress-score">
            <span className="wrong">✘ {mistakeCount}</span>
          </span>
        </div>
        <div className="quiz-progress-track">
          <div className="quiz-progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <div className="template-list">
        {sentences.map((s, i) => {
          if (i < index) {
            return (
              <div key={s.id} className="template-row template-row-done">
                <span className="template-row-num">✔</span>
                <span className="template-row-text">{s.text}</span>
              </div>
            )
          }

          if (i > index) {
            return (
              <div key={s.id} className="template-row template-row-pending">
                <span className="template-row-num">{i + 1}</span>
              </div>
            )
          }

          return (
            <div key={s.id} className={`template-row template-row-active ${status === 'broken' ? 'broken' : ''}`}>
              <span className="template-row-num">{i + 1}</span>

              {status === 'typing' ? (
                <form className="template-active-form" onSubmit={handleSubmit}>
                  <textarea
                    ref={inputRef}
                    rows={2}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSubmit(e)
                      }
                    }}
                    placeholder="הקלד/י את המשפט הבא..."
                    autoFocus
                  />
                  <button type="submit" className="primary-btn">
                    בדוק
                  </button>
                </form>
              ) : (
                <div className="template-broken">
                  <div className="feedback-msg wrong">הרצף נקטע ✘</div>
                  <div className="template-broken-line">
                    <strong>מה שהקלדת: </strong>
                    <span className="wrong-answer">{brokenInput || '(ריק)'}</span>
                  </div>
                  <div className="template-broken-line">
                    <strong>המשפט הנכון: </strong>
                    {current.text}
                  </div>
                  <div className="template-broken-actions">
                    <button className="primary-btn" onClick={retryFromHere}>
                      נסה שוב מכאן (Enter)
                    </button>
                    <button className="secondary-btn" onClick={restartFromStart}>
                      חזרה להתחלה (Tab)
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
