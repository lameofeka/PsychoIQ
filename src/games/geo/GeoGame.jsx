import { useEffect, useState } from 'react'
import CirclePartsGame from '../circleParts/CirclePartsGame'
import PolygonsGame from '../polygons/PolygonsGame'

function CircleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8" />
    </svg>
  )
}

function PolygonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l8 6-3 10H7L4 9l8-6Z" />
    </svg>
  )
}

// "גיאו" isn't a game of its own - it's a landing card that picks between
// the two geometry quizzes (מעגל / מצולעים), reusing each quiz's existing
// top-level component untouched. Their own onExit ("חזרה לדף הבית") still
// goes all the way out to the app's real home, same as every other quiz;
// a small back arrow (shown only while that quiz's own setup screen, phase
// 'inline', is up) returns to this picker instead, since switching straight
// back to the already-selected "גיאו" pill wouldn't remount this component.
export default function GeoGame({ onPhaseChange, onExit }) {
  const [stage, setStage] = useState('menu') // 'menu' | 'circleParts' | 'polygons'
  const [childPhase, setChildPhase] = useState('inline')

  useEffect(() => {
    onPhaseChange?.(stage === 'menu' ? 'inline' : childPhase)
  }, [stage, childPhase])

  function openGame(next) {
    setChildPhase('inline')
    setStage(next)
  }

  function backToMenu() {
    setChildPhase('inline')
    setStage('menu')
  }

  if (stage !== 'menu') {
    const ChildComponent = stage === 'circleParts' ? CirclePartsGame : PolygonsGame
    return (
      <>
        {childPhase === 'inline' && (
          <div className="game-shell geo-back-bar">
            <div className="wizard-topbar">
              <button className="icon-back-btn" onClick={backToMenu} aria-label="חזרה לבחירת גיאו">
                →
              </button>
            </div>
          </div>
        )}
        <ChildComponent onExit={onExit} onPhaseChange={setChildPhase} />
      </>
    )
  }

  return (
    <div className="wizard setup-compact">
      <h2>גיאומטריה</h2>
      <p className="summary-line">באיזה תרגול תרצה/י להתחיל?</p>

      <div className="operation-row geo-menu-row">
        <button className="operation-cube geo-menu-cube" onClick={() => openGame('polygons')}>
          <span className="option-icon">
            <PolygonIcon />
          </span>
          <span>מצולעים</span>
        </button>
        <button className="operation-cube geo-menu-cube" onClick={() => openGame('circleParts')}>
          <span className="option-icon">
            <CircleIcon />
          </span>
          <span>מעגל</span>
        </button>
      </div>
    </div>
  )
}
