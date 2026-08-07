import { useState } from 'react'
import SynonymsManager from './SynonymsManager'
import SynonymsPlay from './SynonymsPlay'
import SynonymsResults from './SynonymsResults'
import { getSynonymSets } from './storage'
import { shuffle } from './logic'

export default function SynonymsGame({ onExit, initialStage = 'manage' }) {
  const [stage, setStage] = useState(() => {
    if (initialStage === 'practice' && getSynonymSets().filter((s) => s.synonyms.length > 0).length > 0) {
      return 'practice'
    }
    return 'manage'
  })
  const [practiceSets, setPracticeSets] = useState(() => {
    if (initialStage === 'practice') {
      const sets = getSynonymSets().filter((s) => s.synonyms.length > 0)
      if (sets.length > 0) return shuffle(sets)
    }
    return []
  })
  const [roundResult, setRoundResult] = useState(null)
  const [roundKey, setRoundKey] = useState(0)

  function startPractice() {
    const sets = getSynonymSets().filter((s) => s.synonyms.length > 0)
    if (sets.length === 0) return
    setPracticeSets(shuffle(sets))
    setRoundKey((k) => k + 1)
    setStage('practice')
  }

  function handleFinish(result) {
    setRoundResult(result)
    setStage('results')
  }

  return (
    <div className="game-shell">
      {stage === 'manage' && <SynonymsManager onExit={onExit} onStartPractice={startPractice} />}
      {stage === 'practice' && (
        <SynonymsPlay key={roundKey} sets={practiceSets} onFinish={handleFinish} onExitQuiz={onExit} />
      )}
      {stage === 'results' && (
        <SynonymsResults
          totalWords={roundResult.totalWords}
          correctTotal={roundResult.correctTotal}
          wrongTotal={roundResult.wrongTotal}
          elapsedMs={roundResult.elapsedMs}
          onPracticeAgain={startPractice}
          onManage={() => setStage('manage')}
          onExit={onExit}
        />
      )}
    </div>
  )
}
