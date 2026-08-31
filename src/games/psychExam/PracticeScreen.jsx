import { useEffect, useRef, useState } from 'react'

export default function PracticeScreen({ question, onAdvance, onBackToCategories }) {
  const canvasRef = useRef(null)
  const drawingRef = useRef(false)
  const lastPointRef = useRef(null)
  const lastMidRef = useRef(null)
  const [selected, setSelected] = useState(null)
  const [answered, setAnswered] = useState(false)
  const [showSolution, setShowSolution] = useState(false)

  // Fresh answer state every time the question changes (component is also
  // remounted via `key={question.id}` in PsychExamGame, but this guards
  // against any future reuse without remounting).
  useEffect(() => {
    setSelected(null)
    setAnswered(false)
    setShowSolution(false)
  }, [question.id])

  useEffect(() => {
    function sizeCanvas() {
      const canvas = canvasRef.current
      if (!canvas) return
      const ratio = window.devicePixelRatio || 1
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      canvas.width = width * ratio
      canvas.height = height * ratio
      const ctx = canvas.getContext('2d')
      ctx.scale(ratio, ratio)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = '#1a1a1a'
      ctx.lineWidth = 2.5
    }
    sizeCanvas()
    window.addEventListener('resize', sizeCanvas)
    return () => window.removeEventListener('resize', sizeCanvas)
  }, [])

  function pointFromEvent(e) {
    const rect = canvasRef.current.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function handlePointerDown(e) {
    // Only draw for Apple Pencil (and mouse, for desktop testing) — ignore
    // touch/palm contact so resting a hand on the iPad screen while writing
    // doesn't leave stray marks.
    if (e.pointerType !== 'pen' && e.pointerType !== 'mouse') return
    canvasRef.current.setPointerCapture(e.pointerId)
    drawingRef.current = true
    const point = pointFromEvent(e)
    lastPointRef.current = point
    lastMidRef.current = point
  }

  function handlePointerMove(e) {
    if (!drawingRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    const point = pointFromEvent(e)
    const last = lastPointRef.current
    const lastMid = lastMidRef.current
    const midX = (last.x + point.x) / 2
    const midY = (last.y + point.y) / 2
    // Each segment must start exactly where the previous one ended (lastMid),
    // not at the raw last point — otherwise consecutive curves leave a gap
    // between the previous segment's end and this one's start.
    ctx.beginPath()
    ctx.moveTo(lastMid.x, lastMid.y)
    ctx.quadraticCurveTo(last.x, last.y, midX, midY)
    ctx.stroke()
    lastPointRef.current = point
    lastMidRef.current = { x: midX, y: midY }
  }

  function stopDrawing() {
    drawingRef.current = false
    lastPointRef.current = null
    lastMidRef.current = null
  }

  function handleClear() {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.restore()
  }

  function handleAnswer(n) {
    if (answered) return
    setSelected(n)
    setAnswered(true)
  }

  return (
    <div className="psych-practice">
      <img className="psych-practice-image" src={`/question_bank/images/${question.image_path}`} alt="" draggable={false} />
      <canvas
        ref={canvasRef}
        className="psych-practice-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDrawing}
        onPointerCancel={stopDrawing}
        onPointerLeave={stopDrawing}
      />

      <button type="button" className="psych-clear-btn" onClick={handleClear}>
        נקה
      </button>

      <div className="psych-answer-picker">
        {[1, 2, 3, 4].map((n) => {
          let cls = 'psych-answer-btn'
          if (answered && n === question.correct_answer) cls += ' psych-answer-btn--correct'
          else if (answered && n === selected) cls += ' psych-answer-btn--wrong'
          return (
            <button key={n} type="button" className={cls} onClick={() => handleAnswer(n)} disabled={answered}>
              {n}
            </button>
          )
        })}
      </div>

      {answered && question.solution_text && (
        <button type="button" className="psych-solution-btn" onClick={() => setShowSolution(true)}>
          ראה פתרון
        </button>
      )}

      {answered && (
        <button type="button" className="psych-next-btn" onClick={onAdvance}>
          השאלה הבאה
        </button>
      )}

      <button type="button" className="psych-back-btn" onClick={onBackToCategories}>
        חזרה
      </button>

      {showSolution && (
        <div className="psych-solution-overlay" onClick={() => setShowSolution(false)}>
          <div className="psych-solution-panel" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="psych-solution-close" onClick={() => setShowSolution(false)}>
              ✕
            </button>
            <p className="psych-solution-text">{question.solution_text}</p>
          </div>
        </div>
      )}
    </div>
  )
}
