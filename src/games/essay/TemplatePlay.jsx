import { useEffect, useRef, useState } from 'react'
import { sentencesMatch } from './logic'
import { vibrateSuccess } from '../../utils/haptics'
import { recordSentenceResult } from './stats'
import { useHtmlClassLock } from '../../utils/useHtmlClassLock'

export default function TemplatePlay({ sentences, onFinish, onExitQuiz }) {
  useHtmlClassLock('quant-gameplay-lock')
  const [index, setIndex] = useState(0)
  const [input, setInput] = useState('')
  const [status, setStatus] = useState('typing') // 'typing' | 'broken'
  const [brokenInput, setBrokenInput] = useState('')
  const [mistakeCount, setMistakeCount] = useState(0)
  const startTimeRef = useRef(Date.now())
  const inputRef = useRef(null)
  // Whether the sentence currently at `index` has broken at least once this
  // pass — recorded against it (as a miss) once it's finally typed
  // correctly, for the progress map. Reset on advance and on a full restart.
  const sentenceMistakeRef = useRef(false)

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

  function handleSubmit(e, valueOverride) {
    e.preventDefault()
    if (status === 'broken') return
    const value = valueOverride !== undefined ? valueOverride : input

    if (sentencesMatch(value, current.text)) {
      vibrateSuccess()
      recordSentenceResult(current.id, !sentenceMistakeRef.current)
      sentenceMistakeRef.current = false
      if (index + 1 < total) {
        setIndex((i) => i + 1)
        setInput('')
      } else {
        onFinish({ mistakeCount, elapsedMs: Date.now() - startTimeRef.current, total })
      }
    } else {
      setBrokenInput(value)
      setMistakeCount((c) => c + 1)
      setStatus('broken')
      sentenceMistakeRef.current = true
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
    sentenceMistakeRef.current = false
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
                    onChange={(e) => {
                      // Some mobile keyboards don't fire a keydown with
                      // key === 'Enter' on Return (IME/composition quirks) -
                      // insertLineBreak on the change event is the reliable
                      // cross-device signal that Return was pressed, so it's
                      // handled here too as a fallback to the keydown check
                      // below, same empty-field convention as every other
                      // quiz (submit-as-wrong, not silently ignored).
                      if (e.nativeEvent.inputType === 'insertLineBreak') {
                        const value = e.target.value.replace(/\n+$/, '')
                        setInput(value)
                        handleSubmit(e, value)
                        return
                      }
                      setInput(e.target.value)
                    }}
                    onKeyDown={(e) => {
                      // stopPropagation matters here: submitting can flip
                      // status to 'broken' within this same handler, and the
                      // document-level Enter/Tab listener below re-registers
                      // itself synchronously before this event finishes
                      // bubbling - without this it would see the fresh
                      // 'broken' status and immediately treat this very
                      // keypress as a "retry", undoing the broken screen
                      // before it's ever shown.
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        e.stopPropagation()
                        handleSubmit(e)
                      } else if (e.key === 'Backspace' && input === '') {
                        e.preventDefault()
                        e.stopPropagation()
                        handleSubmit(e, '')
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
