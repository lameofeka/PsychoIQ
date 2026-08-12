import { useEffect, useState } from 'react'
import SetupWizard from './SetupWizard'
import GamePlay from './GamePlay'

// Endless mode: no round length, no results screen - "יציאה מהתרגול" in
// GamePlay just drops back to the setup screen, same as every other quiz's
// "הגדרות חדשות" exit. Remounting GamePlay (key={roundKey}) on each fresh
// start resets its streak back to 0.
export default function DivisionGame({ onPhaseChange, setupHeaderExtra }) {
  const [stage, setStage] = useState('setup')
  const [roundKey, setRoundKey] = useState(0)

  useEffect(() => {
    onPhaseChange?.(stage === 'setup' ? 'inline' : 'full')
  }, [stage])

  function handleStart() {
    setRoundKey((k) => k + 1)
    setStage('playing')
  }

  return (
    <div className="game-shell">
      {stage === 'setup' && <SetupWizard onStart={handleStart} headerExtra={setupHeaderExtra} />}
      {stage === 'playing' && <GamePlay key={roundKey} onExitQuiz={() => setStage('setup')} />}
    </div>
  )
}
