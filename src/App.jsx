import { useState } from 'react'
import MultiplicationGame from './games/multiplication/MultiplicationGame'
import PowersGame from './games/powers/PowersGame'
import FactorialGame from './games/factorial/FactorialGame'
import PrimesGame from './games/primes/PrimesGame'
import CirclePartsGame from './games/circleParts/CirclePartsGame'
import VocabularyGame from './games/vocabulary/VocabularyGame'
import EssayGame from './games/essay/EssayGame'
import './App.css'

const CATEGORIES = [
  { value: 'quantitative', label: 'כמותי' },
  { value: 'verbal', label: 'מילולי' },
]

const GAMES = [
  {
    id: 'multiplication',
    category: 'quantitative',
    title: 'לוח הכפל',
    description: 'תרגול כפל, חילוק ולוח הכפל בקצב שלך',
    icon: '×÷',
  },
  {
    id: 'powers',
    category: 'quantitative',
    title: 'חזקות',
    description: 'תרגול חזקות ושורשים מהנפוצים בבחינה',
    icon: 'xⁿ',
  },
  {
    id: 'factorial',
    category: 'quantitative',
    title: 'עצרת',
    description: 'תרגול חישובי עצרת בעל פה למספרים 1 עד 6',
    icon: 'n!',
  },
  {
    id: 'primes',
    category: 'quantitative',
    title: 'מספרים ראשוניים',
    description: 'שרשרת המספרים הראשוניים בעל פה, לפי הסדר',
    icon: '2·3·5',
  },
  {
    id: 'circleParts',
    category: 'quantitative',
    title: 'חלקי מעגל',
    description: 'תרגול המרה בין מעלות לשברים מהמעגל',
    icon: '◔',
  },
  {
    id: 'vocabulary',
    category: 'verbal',
    title: 'אוצר מילים',
    description: 'תרגול פירושי מילים מתוך מילון אישי',
    icon: 'Aa',
  },
  {
    id: 'essay',
    category: 'verbal',
    title: 'חיבור',
    description: 'תרגול טמפלייט ומילים נרדפות לחיבור',
    icon: '¶',
  },
]

function App() {
  const [activeGame, setActiveGame] = useState(null)
  const [category, setCategory] = useState('quantitative')

  if (activeGame === 'multiplication') {
    return (
      <div className="app-shell">
        <MultiplicationGame onExit={() => setActiveGame(null)} />
      </div>
    )
  }

  if (activeGame === 'powers') {
    return (
      <div className="app-shell">
        <PowersGame onExit={() => setActiveGame(null)} />
      </div>
    )
  }

  if (activeGame === 'factorial') {
    return (
      <div className="app-shell">
        <FactorialGame onExit={() => setActiveGame(null)} />
      </div>
    )
  }

  if (activeGame === 'primes') {
    return (
      <div className="app-shell">
        <PrimesGame onExit={() => setActiveGame(null)} />
      </div>
    )
  }

  if (activeGame === 'circleParts') {
    return (
      <div className="app-shell">
        <CirclePartsGame onExit={() => setActiveGame(null)} />
      </div>
    )
  }

  if (activeGame === 'vocabulary') {
    return (
      <div className="app-shell">
        <VocabularyGame onExit={() => setActiveGame(null)} />
      </div>
    )
  }

  if (activeGame === 'essay') {
    return (
      <div className="app-shell">
        <EssayGame onExit={() => setActiveGame(null)} />
      </div>
    )
  }

  return (
    <div className="app-shell">
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
            onClick={() => setCategory(c.value)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="game-menu">
        {GAMES.filter((game) => game.category === category).map((game) => (
          <button key={game.id} className="game-card" onClick={() => setActiveGame(game.id)}>
            <span className="game-card-icon">{game.icon}</span>
            <span className="game-card-title">{game.title}</span>
            <span className="game-card-desc">{game.description}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default App
