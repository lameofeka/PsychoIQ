import { useEffect, useState } from 'react'
import MultiplicationGame from './games/multiplication/MultiplicationGame'
import PowersGame from './games/powers/PowersGame'
import FactorialGame from './games/factorial/FactorialGame'
import PrimesGame from './games/primes/PrimesGame'
import GeoGame from './games/geo/GeoGame'
import VocabularyGame from './games/vocabulary/VocabularyGame'
import EssayGame from './games/essay/EssayGame'
import { recordVisitAndGetStreak } from './streak'
import { getMasteryBreakdown } from './overallProgress'
import './App.css'

function FlameIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.5c1 3-3 4.5-3 8.5a3 3 0 0 0 6 0c0-1.2-1-2.3-1-3.3 2 1.2 3.5 4 3.5 6.3a5.5 5.5 0 0 1-11 0c0-5.3 3.5-6.5 5.5-11.5Z" />
    </svg>
  )
}

function ProgressIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8" />
      <path d="M9 12.3l2 2 4-4.6" />
    </svg>
  )
}

function QuantitativeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19V10M12 19V5M20 19v-7" />
    </svg>
  )
}

function VerbalIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h11M4 12h16M4 18h8" />
    </svg>
  )
}

const CATEGORIES = [
  { value: 'quantitative', label: 'כמותי', Icon: QuantitativeIcon },
  { value: 'verbal', label: 'מילולי', Icon: VerbalIcon },
]

const GAMES = [
  {
    id: 'multiplication',
    category: 'quantitative',
    title: 'לוח הכפל',
    Component: MultiplicationGame,
  },
  {
    id: 'powers',
    category: 'quantitative',
    title: 'חזקות',
    Component: PowersGame,
  },
  {
    id: 'factorial',
    category: 'quantitative',
    title: 'עצרת',
    Component: FactorialGame,
  },
  {
    id: 'primes',
    category: 'quantitative',
    title: 'ראשוניים',
    Component: PrimesGame,
  },
  {
    id: 'geo',
    category: 'quantitative',
    title: 'גיאומטריה',
    // "גיאומטריה" is the longest label in the row and crowds the other 4
    // pills on a narrow phone screen - shown only below the mobile
    // breakpoint (see .game-pill-title-short in App.css).
    shortTitle: 'גיאו',
    Component: GeoGame,
  },
  {
    id: 'vocabulary',
    category: 'verbal',
    title: 'אוצר מילים',
    Component: VocabularyGame,
  },
  {
    id: 'essay',
    category: 'verbal',
    title: 'חיבור',
    Component: EssayGame,
  },
]

// The page in RTL flows right-to-left, so the first game per category in
// GAMES lands as the rightmost pill — matching that as the always-on
// default keeps a selection pressed at all times, never an empty switch.
function firstGameIdForCategory(cat) {
  return GAMES.find((g) => g.category === cat)?.id
}

function masteryTier(percent) {
  return percent < 25 ? 'low' : percent <= 50 ? 'mid' : 'high'
}

function App() {
  const [streak] = useState(() => recordVisitAndGetStreak())
  const [mastery, setMastery] = useState(null)
  const [showMasteryDetail, setShowMasteryDetail] = useState(false)
  const [category, setCategory] = useState('quantitative')
  const [selectedGameId, setSelectedGameId] = useState(() => firstGameIdForCategory('quantitative'))
  // 'inline' = the game's landing/setup screen, shown under the pill row
  // alongside the header. 'full' = actual gameplay/results, which takes
  // over the whole screen like before (header + pills hidden).
  const [phase, setPhase] = useState('inline')

  // Recompute whenever the home/inline chrome (where the badge lives) comes
  // back into view - including right after finishing a round - so the
  // number stays fresh without needing a manual refresh.
  useEffect(() => {
    if (phase !== 'inline') return
    let cancelled = false
    getMasteryBreakdown().then((breakdown) => {
      if (!cancelled) setMastery(breakdown)
    })
    return () => {
      cancelled = true
    }
  }, [phase])

  // Home/setup screens tint the iOS status bar to match the app background;
  // full-screen quizzes (phase 'full') keep it white, matching their own
  // white/edge-to-edge chrome. iOS Safari is unreliable about noticing a
  // plain setAttribute() on the existing tag — swapping in a freshly
  // inserted <meta> node is the workaround that actually gets picked up.
  useEffect(() => {
    const color = phase === 'inline' ? '#f6f4fb' : '#ffffff'
    document.querySelector('meta[name="theme-color"]')?.remove()
    const meta = document.createElement('meta')
    meta.name = 'theme-color'
    meta.content = color
    document.head.appendChild(meta)
  }, [phase])

  useEffect(() => {
    if (!showMasteryDetail) return
    function handleOutsideClick(e) {
      if (!e.target.closest('.mastery-badge-wrap')) setShowMasteryDetail(false)
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [showMasteryDetail])

  function selectCategory(value) {
    setCategory(value)
    setSelectedGameId(firstGameIdForCategory(value))
    setPhase('inline')
  }

  function selectPill(gameId) {
    setSelectedGameId(gameId)
    setPhase('inline')
  }

  function collapseToHome() {
    setSelectedGameId(firstGameIdForCategory(category))
    setPhase('inline')
  }

  const selectedGame = GAMES.find((g) => g.id === selectedGameId)
  const showChrome = phase === 'inline'

  return (
    <div className="app-shell">
      {showChrome && (
        <>
          <header className="app-header">
            {streak > 0 && (
              <div className="streak-badge" title={`רצף של ${streak} ${streak === 1 ? 'יום' : 'ימים'}`}>
                <span className="streak-flame">
                  <FlameIcon />
                </span>
                <span>{streak}</span>
              </div>
            )}
            <h1>PsychoIQ</h1>
            <p>תרגול לפסיכומטרי</p>
            {mastery !== null && (
              <div className="mastery-badge-wrap">
                <button
                  type="button"
                  className={`mastery-badge mastery-badge--${masteryTier(mastery.overall)}`}
                  onClick={() => setShowMasteryDetail((v) => !v)}
                  title="אחוז שליטה כולל בכל הפלטפורמה"
                >
                  <span className="mastery-check">
                    <ProgressIcon />
                  </span>
                  <span>{mastery.overall}%</span>
                </button>
                {showMasteryDetail && (
                  <div className="mastery-popover">
                    <div className="mastery-popover-row">
                      <span>כמותי</span>
                      <span className={`mastery-popover-value mastery-popover-value--${masteryTier(mastery.quantitative)}`}>
                        {mastery.quantitative}%
                      </span>
                    </div>
                    <div className="mastery-popover-row">
                      <span>מילולי</span>
                      <span className={`mastery-popover-value mastery-popover-value--${masteryTier(mastery.verbal)}`}>
                        {mastery.verbal}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </header>

          <div className="category-switch">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                className={`mode-switch-btn ${category === c.value ? 'active' : ''}`}
                onClick={() => selectCategory(c.value)}
              >
                <c.Icon />
                {c.label}
              </button>
            ))}
          </div>

          <div className="game-pill-row">
            {GAMES.filter((game) => game.category === category).map((game) => (
              <button
                key={game.id}
                type="button"
                className={`game-pill ${selectedGameId === game.id ? 'selected' : ''}`}
                onClick={() => selectPill(game.id)}
              >
                <span className="game-pill-title-full">{game.title}</span>
                <span className="game-pill-title-short">{game.shortTitle ?? game.title}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {selectedGame && (
        <selectedGame.Component key={selectedGame.id} onExit={collapseToHome} onPhaseChange={setPhase} />
      )}
    </div>
  )
}

export default App
