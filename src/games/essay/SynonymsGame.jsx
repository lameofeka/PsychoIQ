import { useState } from 'react'
import SynonymsManager from './SynonymsManager'
import SynonymsPlay from './SynonymsPlay'
import SynonymsProgressMap from './SynonymsProgressMap'
import SynonymsResults from './SynonymsResults'
import { getSynonymSets } from './storage'
import { shuffle } from './logic'

export default function SynonymsGame({ onExit, initialStage = 'manage' }) {
  const [stage, setStage] = useState(() => {
    if (initialStage === 'practice' && getSynonymSets().filter((s) => s.synonyms.length > 0).length > 0) {
      return 'practice'
    }
    // "manage" now lands on the progress map first — the raw add/edit/delete
    // table (SynonymsManager) is reached from there via its "עריכה" button.
    return 'progress'
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

  function startPracticeWithSets(sets) {
    if (!sets || sets.length === 0) return
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
      {stage === 'progress' && (
        <SynonymsProgressMap
          onBack={onExit}
          onEdit={() => setStage('edit')}
          onStartPractice={startPractice}
          onPracticeWeak={startPracticeWithSets}
        />
      )}
      {stage === 'edit' && <SynonymsManager onExit={() => setStage('progress')} onStartPractice={startPractice} />}
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
          onManage={() => setStage('progress')}
          onExit={onExit}
        />
      )}
    </div>
  )
}
