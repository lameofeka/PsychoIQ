import { useEffect, useState } from 'react'
import PrimesGame from './PrimesGame'
import DivisionGame from '../division/DivisionGame'
import IntegersGame from '../integers/IntegersGame'

const QUIZZES = [
  { value: 'primes', label: 'ראשוניים', Component: PrimesGame },
  { value: 'division', label: 'חלוקה', Component: DivisionGame },
  { value: 'integers', label: 'שלמים', Component: IntegersGame },
]

// "ראשוניים" isn't a single game anymore - it opens straight into the
// primes chain quiz (the default) and lets a switch swap over to "חלוקה"
// instead, reusing each one's existing top-level component untouched.
// Exactly the same pattern as geo's מעגל/מצולעים/פיטגורס switch (see
// GeoGame.jsx): the switch is threaded in as `setupHeaderExtra` and
// rendered by each quiz's own SetupWizard inside its own white card's top,
// so it only shows while that quiz's setup screen (phase 'inline') is up -
// mid-quiz there's nowhere sensible to jump to anyway.
export default function PrimesGroup({ onPhaseChange, onExit }) {
  const [activeQuiz, setActiveQuiz] = useState('primes')
  const [childPhase, setChildPhase] = useState('inline')

  useEffect(() => {
    onPhaseChange?.(childPhase)
  }, [childPhase])

  const ChildComponent = QUIZZES.find((q) => q.value === activeQuiz).Component

  const switchBar = (
    <div className="subgame-switch-row">
      <div className="mode-switch">
        {QUIZZES.map((q) => (
          <button
            key={q.value}
            type="button"
            className={`mode-switch-btn ${activeQuiz === q.value ? 'active' : ''}`}
            onClick={() => setActiveQuiz(q.value)}
          >
            {q.label}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <ChildComponent
      onExit={onExit}
      onPhaseChange={setChildPhase}
      setupHeaderExtra={childPhase === 'inline' ? switchBar : null}
    />
  )
}
