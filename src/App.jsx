import { useState } from 'react'
import MultiplicationGame from './games/multiplication/MultiplicationGame'
import PowersGame from './games/powers/PowersGame'
import FactorialGame from './games/factorial/FactorialGame'
import PrimesGame from './games/primes/PrimesGame'
import CirclePartsGame from './games/circleParts/CirclePartsGame'
import VocabularyGame from './games/vocabulary/VocabularyGame'
import EssayGame from './games/essay/EssayGame'
import './App.css'

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
    id: 'circleParts',
    category: 'quantitative',
    title: 'מעגל',
    Component: CirclePartsGame,
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

function App() {
  const [category, setCategory] = useState('quantitative')
  const [selectedGameId, setSelectedGameId] = useState(null)
  // 'inline' = the game's landing/setup screen, shown under the pill row
  // alongside the header. 'full' = actual gameplay/results, which takes
  // over the whole screen like before (header + pills hidden).
  const [phase, setPhase] = useState('inline')

  function selectCategory(value) {
    setCategory(value)
    setSelectedGameId(null)
  }

  function togglePill(gameId) {
    if (gameId === selectedGameId) {
      setSelectedGameId(null)
      return
    }
    setSelectedGameId(gameId)
    setPhase('inline')
  }

  function collapseToHome() {
    setSelectedGameId(null)
  }

  const selectedGame = GAMES.find((g) => g.id === selectedGameId)
  const showChrome = !selectedGame || phase === 'inline'

  return (
    <div className="app-shell">
      {showChrome && (
        <>
          <header className="app-header">
            <h1>PsychoIQ</h1>
            <p>תרגול לפסיכומטרי</p>
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
                onClick={() => togglePill(game.id)}
              >
                {game.title}
                {selectedGameId === game.id && <span className="game-pill-close">×</span>}
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
