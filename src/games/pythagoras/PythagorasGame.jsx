import { useEffect, useState } from 'react'
import SetupWizard from './SetupWizard'
import GamePlay from './GamePlay'
import Results from './Results'

export default function PythagorasGame({ onPhaseChange, onExit, setupHeaderExtra }) {
  const [stage, setStage] = useState('setup')
  const [settings, setSettings] = useState(null)
  const [roundResult, setRoundResult] = useState(null)
  const [roundKey, setRoundKey] = useState(0)

  useEffect(() => {
    onPhaseChange?.(stage === 'setup' ? 'inline' : 'full')
  }, [stage])

  function handleSetupComplete(newSettings) {
    setSettings(newSettings)
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

  function handlePracticeWeak(weakTriples) {
    setSettings({ weakTriples })
    setRoundKey((k) => k + 1)
    setStage('playing')
  }

  function handleMistakesOnly() {
    const mistakes = roundResult.answers.filter((a) => !a.isCorrect)
    if (mistakes.length === 0) return
    const weakTriples = mistakes.map((a) => a.question.triple)
    setSettings({ weakTriples })
    setRoundKey((k) => k + 1)
    setStage('playing')
  }

  return (
    <div className="game-shell">
      {stage === 'setup' && (
        <SetupWizard onComplete={handleSetupComplete} onPracticeWeak={handlePracticeWeak} headerExtra={setupHeaderExtra} />
      )}
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
