import { useEffect, useMemo, useState } from 'react'
import PracticeScreen from './PracticeScreen'
import { loadOrder, saveOrder } from './rotation'
import './psychExam.css'

const CATEGORIES = [
  { value: 'quant', label: 'כמותי' },
  { value: 'verbal', label: 'מילולי' },
  { value: 'english', label: 'אנגלית' },
  { value: 'random', label: 'רנדומלי' },
]

// Hidden entry point into this module — see App.jsx, reached by
// double-clicking/double-tapping the "PsychoIQ" title, not from the normal
// game-pill menu. Fully self-contained: owns the whole screen while mounted
// and hands control back via onExit, so it doesn't need to participate in
// the outer app's phase/chrome machinery at all.
export default function PsychExamGame({ onExit }) {
  const [allQuestions, setAllQuestions] = useState(null) // null = still loading
  const [loadFailed, setLoadFailed] = useState(false)
  const [activeCategory, setActiveCategory] = useState(null) // null = on the category-select home screen
  // Rotation order for the active category: an array of question ids, front
  // = "up next". Answering a question moves it to the back (handleAdvance)
  // and persists via rotation.js, so a question only repeats once every
  // other question in the pool has been shown — across sessions too.
  const [order, setOrder] = useState([])

  useEffect(() => {
    let cancelled = false
    fetch('/question_bank/questions_index.json')
      .then((res) => {
        if (!res.ok) throw new Error('failed to load question bank')
        return res.json()
      })
      .then((data) => {
        if (!cancelled) setAllQuestions(data)
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Own status-bar tinting while mounted, independent of App.jsx's
  // phase-driven effect (this screen replaces the whole app tree, not just
  // its inline chrome) — same swap-in-a-fresh-<meta> technique as App.jsx,
  // since iOS Safari doesn't reliably notice a plain attribute mutation.
  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.remove()
    const meta = document.createElement('meta')
    meta.name = 'theme-color'
    meta.content = '#ffffff'
    document.head.appendChild(meta)
  }, [])

  const byId = useMemo(() => new Map((allQuestions ?? []).map((q) => [q.id, q])), [allQuestions])

  function startCategory(value) {
    const pool = value === 'random' ? allQuestions : allQuestions.filter((q) => q.category === value)
    const poolIds = pool.map((q) => q.id)
    const isPriority = (id) => byId.get(id)?.batch === 'campus'
    setOrder(loadOrder(value, poolIds, isPriority))
    setActiveCategory(value)
  }

  function handleAdvance() {
    setOrder((prev) => {
      if (prev.length < 2) return prev
      const [first, ...rest] = prev
      const next = [...rest, first]
      saveOrder(activeCategory, next)
      return next
    })
  }

  function handleBackToCategories() {
    setActiveCategory(null)
    setOrder([])
  }

  const current = activeCategory && order.length ? byId.get(order[0]) : null
  const emptyCategory = activeCategory && allQuestions && order.length === 0

  return (
    <div className="psych-exam-shell">
      {current && (
        <PracticeScreen key={current.id} question={current} onAdvance={handleAdvance} onBackToCategories={handleBackToCategories} />
      )}

      {!activeCategory && (
        <div className="psych-exam-home">
          <button type="button" className="psych-exam-exit" onClick={onExit} aria-label="חזרה לאפליקציה">
            ✕
          </button>
          <h1>תרגול פסיכומטרי</h1>
          {loadFailed && <p className="psych-exam-status">שגיאה בטעינת בנק השאלות</p>}
          {!loadFailed && allQuestions === null && <p className="psych-exam-status">טוען...</p>}
          {allQuestions && (
            <div className="psych-exam-cards">
              {CATEGORIES.map((c) => (
                <button key={c.value} type="button" className="psych-exam-card" onClick={() => startCategory(c.value)}>
                  {c.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {emptyCategory && (
        <div className="psych-exam-home">
          <p className="psych-exam-status">אין עדיין שאלות בקטגוריה הזו.</p>
          <div className="psych-exam-cards">
            <button type="button" className="psych-exam-card" onClick={handleBackToCategories}>
              בחירת קטגוריה
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
