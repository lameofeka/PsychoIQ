import { useState } from 'react'
import TemplateManager from './TemplateManager'
import TemplatePlay from './TemplatePlay'
import TemplateProgressMap from './TemplateProgressMap'
import TemplateResults from './TemplateResults'
import { getSentences } from './storage'

export default function TemplateGame({ onExit, initialStage = 'manage' }) {
  const [stage, setStage] = useState(() => {
    if (initialStage === 'practice' && getSentences().length > 0) return 'practice'
    // "manage" now lands on the progress map first — the raw add/edit/delete
    // table (TemplateManager) is reached from there via its "עריכה" button.
    return 'progress'
  })
  const [practiceSentences, setPracticeSentences] = useState(() => {
    if (initialStage === 'practice') return getSentences()
    return []
  })
  const [roundResult, setRoundResult] = useState(null)
  const [roundKey, setRoundKey] = useState(0)

  function startPractice() {
    const sentences = getSentences()
    if (sentences.length === 0) return
    setPracticeSentences(sentences)
    setRoundKey((k) => k + 1)
    setStage('practice')
  }

  function startPracticeWithSentences(sentences) {
    if (!sentences || sentences.length === 0) return
    setPracticeSentences(sentences)
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
        <TemplateProgressMap
          onBack={onExit}
          onEdit={() => setStage('edit')}
          onStartPractice={startPractice}
          onPracticeWeak={startPracticeWithSentences}
        />
      )}
      {stage === 'edit' && <TemplateManager onExit={() => setStage('progress')} onStartPractice={startPractice} />}
      {stage === 'practice' && (
        <TemplatePlay
          key={roundKey}
          sentences={practiceSentences}
          onFinish={handleFinish}
          onExitQuiz={onExit}
        />
      )}
      {stage === 'results' && (
        <TemplateResults
          total={roundResult.total}
          mistakeCount={roundResult.mistakeCount}
          elapsedMs={roundResult.elapsedMs}
          onPracticeAgain={startPractice}
          onManage={() => setStage('progress')}
          onExit={onExit}
        />
      )}
    </div>
  )
}
