import { useEffect, useState } from 'react'
import SetupWizard from './SetupWizard'
import GamePlay from './GamePlay'
import Results from './Results'
import { OPERATIONS, RANGE_TYPES } from './logic'

export default function MultiplicationGame({ onPhaseChange }) {
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

  function handlePracticeWeak(factPairs) {
    setSettings({ operation: OPERATIONS.MULTIPLY, rangeType: RANGE_TYPES.WEAK, factPairs })
    setRoundKey((k) => k + 1)
    setStage('playing')
  }

  function handleMistakesOnly() {
    const mistakes = roundResult.answers.filter((a) => !a.isCorrect)
    if (mistakes.length === 0) return
    const factPairs = mistakes.map((a) => [a.question.a, a.question.b])
    setSettings({ operation: settings.operation, rangeType: RANGE_TYPES.WEAK, factPairs })
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
