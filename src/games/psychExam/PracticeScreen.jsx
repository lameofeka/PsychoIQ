import { useEffect, useRef, useState } from 'react'

export default function PracticeScreen({ question, onAdvance, onBackToCategories }) {
  const canvasRef = useRef(null)
  const drawingRef = useRef(false)
  const lastPointRef = useRef(null)
  const [selected, setSelected] = useState(null)
  const [answered, setAnswered] = useState(false)

  // Fresh answer state every time the question changes (component is also
  // remounted via `key={question.id}` in PsychExamGame, but this guards
  // against any future reuse without remounting).
  useEffect(() => {
    setSelected(null)
    setAnswered(false)
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
    canvasRef.current.setPointerCapture(e.pointerId)
    drawingRef.current = true
    lastPointRef.current = pointFromEvent(e)
  }

  function handlePointerMove(e) {
    if (!drawingRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    const point = pointFromEvent(e)
    const last = lastPointRef.current
    const midX = (last.x + point.x) / 2
    const midY = (last.y + point.y) / 2
    ctx.beginPath()
    ctx.moveTo(last.x, last.y)
    ctx.quadraticCurveTo(last.x, last.y, midX, midY)
    ctx.stroke()
    lastPointRef.current = point
  }

  function stopDrawing() {
    drawingRef.current = false
    lastPointRef.current = null
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

      {answered && (
        <button type="button" className="psych-next-btn" onClick={onAdvance}>
          השאלה הבאה
        </button>
      )}

      <button type="button" className="psych-back-btn" onClick={onBackToCategories}>
        חזרה
      </button>
    </div>
  )
}
