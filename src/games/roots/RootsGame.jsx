import { useEffect, useState } from 'react'
import SetupWizard from './SetupWizard'
import GamePlay from './GamePlay'
import Results from './Results'
import { generateRound } from './logic'
import { getRoots, loadDictionary } from './dictionary'

export default function RootsGame({ onPhaseChange }) {
  const [ready, setReady] = useState(false)
  const [stage, setStage] = useState('setup')
  const [kind, setKind] = useState(null)
  const [group, setGroup] = useState('all')
  const [questions, setQuestions] = useState([])
  const [roundResult, setRoundResult] = useState(null)
  const [roundKey, setRoundKey] = useState(0)

  useEffect(() => {
    loadDictionary().then(() => setReady(true))
  }, [])

  useEffect(() => {
    onPhaseChange?.(stage === 'setup' ? 'inline' : 'full')
  }, [stage])

  function handleSetupComplete(selectedKind, selectedGroup) {
    const roots = selectedGroup === 'all' ? getRoots() : getRoots().filter((r) => r.group === selectedGroup)
    setKind(selectedKind)
    setGroup(selectedGroup)
    setQuestions(generateRound(selectedKind, roots))
    setRoundKey((k) => k + 1)
    setStage('playing')
  }

  function handlePracticeWeak(weakQuestions) {
    setKind(null)
    setQuestions(weakQuestions)
    setRoundKey((k) => k + 1)
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

  function handleMistakesOnly() {
    const mistakes = roundResult.answers.filter((a) => !a.isCorrect).map((a) => a.question)
    if (mistakes.length === 0) return
    setQuestions(mistakes)
    setRoundKey((k) => k + 1)
    setStage('playing')
  }

  if (!ready) {
    return (
      <div className="game-shell">
        <div className="wizard">
          <p className="summary-line">טוען שורשים...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="game-shell">
      {stage === 'setup' && (
        <SetupWizard
          initialKind={kind}
          initialGroup={group}
          onComplete={handleSetupComplete}
          onPracticeWeak={handlePracticeWeak}
        />
      )}
      {stage === 'playing' && (
        <GamePlay key={roundKey} questions={questions} onFinish={handleFinish} onExitQuiz={handleNewSettings} />
      )}
      {stage === 'results' && (
        <Results
          answers={roundResult.answers}
          elapsedMs={roundResult.elapsedMs}
          onPlayAgain={handlePlayAgain}
          onMistakesOnly={handleMistakesOnly}
          onNewSettings={handleNewSettings}
        />
      )}
    </div>
  )
}
