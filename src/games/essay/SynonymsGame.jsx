import { useState } from 'react'
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
    // "manage" now lands on the progress map, which also has its own inline
    // add/edit/delete mode — there's no separate editing screen anymore.
    return 'progress'
  })
  const [practiceSets, setPracticeSets] = useState(() => {
    if (initialStage === 'practice') {
      const sets = getSynonymSets().filter((s) => s.synonyms.length > 0)
      if (sets.length > 0) return sets
    }
    return []
  })
  const [roundResult, setRoundResult] = useState(null)
  const [roundKey, setRoundKey] = useState(0)

  // Fixed order (as authored in the data file), not shuffled - the main
  // "start practice" flow always drills the words in the same sequence.
  function startPractice() {
    const sets = getSynonymSets().filter((s) => s.synonyms.length > 0)
    if (sets.length === 0) return
    setPracticeSets(sets)
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
    <div className={`game-shell ${stage === 'progress' ? 'wide' : ''}`}>
      {stage === 'progress' && (
        <SynonymsProgressMap onBack={onExit} onStartPractice={startPractice} onPracticeWeak={startPracticeWithSets} />
      )}
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
