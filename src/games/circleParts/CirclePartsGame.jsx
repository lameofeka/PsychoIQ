import { useEffect, useState } from 'react'
import SetupWizard from './SetupWizard'
import GamePlay from './GamePlay'
import Results from './Results'
import { OPERATIONS } from './logic'

export default function CirclePartsGame({ onPhaseChange }) {
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

  function handlePracticeWeak(weakFacts) {
    setSettings({ operation: OPERATIONS.COMBINED, weakFacts })
    setRoundKey((k) => k + 1)
    setStage('playing')
  }

  function handleMistakesOnly() {
    const mistakes = roundResult.answers.filter((a) => !a.isCorrect)
    if (mistakes.length === 0) return
    const weakFacts = mistakes.map((a) => a.question.fact)
    setSettings({ operation: settings.operation, weakFacts })
    setRoundKey((k) => k + 1)
    setStage('playing')
  }

  return (
    <div className="game-shell">
      {stage === 'setup' && (
        <SetupWizard
          initialSettings={settings}
          onComplete={handleSetupComplete}
          onPracticeWeak={handlePracticeWeak}
        />
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
        />
      )}
    </div>
  )
}
