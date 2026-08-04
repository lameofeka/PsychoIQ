import { useEffect, useState } from 'react'
import SetupWizard from './SetupWizard'
import GamePlay from './GamePlay'
import Results from './Results'

export default function PrimesGame({ onPhaseChange }) {
  const [stage, setStage] = useState('setup')
  const [roundResult, setRoundResult] = useState(null)
  const [roundKey, setRoundKey] = useState(0)

  useEffect(() => {
    onPhaseChange?.(stage === 'setup' ? 'inline' : 'full')
  }, [stage])

  function handleStart() {
    setStage('playing')
  }

  function handleFinish(result) {
    setRoundResult(result)
    setStage('results')
  }

  function handlePlayAgain() {
    setRoundKey((k) => k + 1)
    setStage('playing')
  }

  function handleNewSettings() {
    setStage('setup')
  }

  return (
    <div className="game-shell">
      {stage === 'setup' && <SetupWizard onStart={handleStart} />}
      {stage === 'playing' && <GamePlay key={roundKey} onFinish={handleFinish} onExitQuiz={handleNewSettings} />}
      {stage === 'results' && (
        <Results
          correctCount={roundResult.correctCount}
          elapsedMs={roundResult.elapsedMs}
          onPlayAgain={handlePlayAgain}
          onNewSettings={handleNewSettings}
        />
      )}
    </div>
  )
}
