import { useEffect, useState } from 'react'
import CirclePartsGame from '../circleParts/CirclePartsGame'
import PolygonsGame from '../polygons/PolygonsGame'
import PythagorasGame from '../pythagoras/PythagorasGame'

const QUIZZES = [
  { value: 'circleParts', label: 'מעגל', Component: CirclePartsGame },
  { value: 'polygons', label: 'מצולעים', Component: PolygonsGame },
  { value: 'pythagoras', label: 'פיטגורס', Component: PythagorasGame },
]

// "גיאומטריה" isn't a game of its own - it opens straight into "מעגל" (the
// default) and lets a switch swap between the three geometry quizzes,
// reusing each one's existing top-level component untouched. The switch is
// threaded in as `setupHeaderExtra` and rendered by each quiz's own
// SetupWizard inside its own white card's top bar - not floated above it -
// so it only shows while that quiz's setup screen (phase 'inline') is up;
// mid-quiz there's nowhere sensible to jump to anyway. Their own onExit
// ("חזרה לדף הבית") still goes all the way out to the app's real home, same
// as every other quiz; re-selecting the "גיאומטריה" pill remounts this
// component fresh, landing back on "מעגל" every time.
export default function GeoGame({ onPhaseChange, onExit }) {
  const [activeQuiz, setActiveQuiz] = useState('circleParts')
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
