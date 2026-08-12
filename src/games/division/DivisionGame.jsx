import { useEffect, useState } from 'react'
import SetupWizard from './SetupWizard'
import GamePlay from './GamePlay'
import Results from './Results'

export default function DivisionGame({ onPhaseChange, onExit }) {
  const [stage, setStage] = useState('setup')
  const [settings, setSettings] = useState(null)
  const [roundResult, setRoundResult] = useState(null)
  const [roundKey, setRoundKey] = useState(0)

  useEffect(() => {
    onPhaseChange?.(stage === 'setup' ? 'inline' : 'full')
  }, [stage])

  function handleStart() {
    setSettings({})
    setStage('playing')
  }

  function handleFinish(result) {
    setRoundResult(result)
    setStage('results')
  }

  function handlePlayAgain() {
    setSettings({})
    setRoundKey((k) => k + 1)
    setStage('playing')
  }

  function handleNewSettings() {
    setStage('setup')
  }

  function handleMistakesOnly() {
    const mistakes = roundResult.answers.filter((a) => !a.isCorrect)
    if (mistakes.length === 0) return
    const retryValues = mistakes.map((a) => a.question.value)
    setSettings({ retryValues })
    setRoundKey((k) => k + 1)
    setStage('playing')
  }

  return (
    <div className="game-shell">
      {stage === 'setup' && <SetupWizard onStart={handleStart} />}
      {stage === 'playing' && (
        <GamePlay key={roundKey} settings={settings} onFinish={handleFinish} onExitQuiz={handleNewSettings} />
      )}
      {stage === 'results' && (
        <Results
          settings={settings}
          answers={roundResult.answers}
          elapsedMs={roundResult.elapsedMs}
          onPlayAgain={handlePlayAgain}
          onNewSettings={handleNewSettings}
          onMistakesOnly={handleMistakesOnly}
          onExit={onExit}
        />
      )}
    </div>
  )
}
