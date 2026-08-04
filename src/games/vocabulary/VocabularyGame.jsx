import { useEffect, useRef, useState } from 'react'
import GroupSelect from './GroupSelect'
import DictionaryManager from './DictionaryManager'
import MistakesList from './MistakesList'
import GamePlay from './GamePlay'
import Results from './Results'
import { getWords, getGroups, loadDictionary } from './dictionary'
import { shuffle } from './logic'
import { recordGroupResult, recordWordResult, runMistakeLockMigrationOnce, setLastPracticedGroup } from './stats'

const MISTAKES_LABEL = 'תרגול טעויות'

function formatRanges(indices) {
  const parts = []
  let start = indices[0]
  let prev = indices[0]
  for (let i = 1; i <= indices.length; i++) {
    const cur = indices[i]
    if (cur === prev + 1) {
      prev = cur
      continue
    }
    parts.push(start === prev ? `${start}` : `${start}-${prev}`)
    start = cur
    prev = cur
  }
  return parts.join(', ')
}

function groupLabelFor(words, totalGroups) {
  const indices = [...new Set(words.map((w) => w.groupIndex).filter((i) => i != null))].sort((a, b) => a - b)
  if (indices.length === 0) return null
  if (totalGroups != null && indices.length === totalGroups) return 'הכל'
  if (indices.length === 1) return `קבוצה ${indices[0]}`
  return `קבוצות ${formatRanges(indices)}`
}

// Words captured at round-start can go stale if the user edits one mid-quiz
// (the edit is saved to the dictionary immediately, but this list still
// holds the old snapshot) — re-read each word fresh before reusing the list.
function refreshWords(list) {
  const byId = new Map(getWords().map((w) => [w.id, w]))
  return list.map((w) => {
    const fresh = byId.get(w.id)
    return fresh ? { ...fresh, groupIndex: w.groupIndex } : w
  })
}

export default function VocabularyGame({ onExit, onPhaseChange }) {
  const [ready, setReady] = useState(false)
  const [stage, setStage] = useState('groupSelect')
  const [practiceWords, setPracticeWords] = useState([])
  const [practiceLabel, setPracticeLabel] = useState(null)
  const [roundResult, setRoundResult] = useState(null)
  const [roundKey, setRoundKey] = useState(0)
  const [useBufferedQuiz, setUseBufferedQuiz] = useState(false)
  const [progressSaveThreshold, setProgressSaveThreshold] = useState(30)
  // Words already scored in the current round-chain — "נסה שוב" replays the
  // same chain and must not record additional attempts per word, only the
  // first outcome each word got when the chain started should count.
  const recordedThisChainRef = useRef(new Set())

  useEffect(() => {
    loadDictionary().then(() => {
      runMistakeLockMigrationOnce(getWords())
      setReady(true)
    })
  }, [])

  useEffect(() => {
    onPhaseChange?.(stage === 'groupSelect' ? 'inline' : 'full')
  }, [stage])

  function startRound(words, label) {
    recordedThisChainRef.current = new Set()
    setPracticeWords(words)
    setPracticeLabel(label)
    setRoundKey((k) => k + 1)
    setStage('playing')
  }

  function handleStart(words) {
    const totalGroups = getGroups(getWords()).length
    const selectedGroupCount = new Set(words.map((w) => w.groupIndex).filter((i) => i != null)).size
    const isFullDictionary = totalGroups > 0 && selectedGroupCount === totalGroups
    setUseBufferedQuiz(isFullDictionary)
    setProgressSaveThreshold(25)
    startRound(isFullDictionary ? shuffle(words) : words, groupLabelFor(words, totalGroups))
  }

  function handleStartMistakes(words) {
    setUseBufferedQuiz(true)
    setProgressSaveThreshold(30)
    startRound(words, MISTAKES_LABEL)
  }

  function handleProgressSave(entries) {
    for (const a of entries) {
      if (!recordedThisChainRef.current.has(a.word.id)) {
        recordWordResult(a.word.id, a.isCorrect)
        recordedThisChainRef.current.add(a.word.id)
      }
    }
  }

  function handleFinish(result) {
    const byGroup = new Map()
    for (const a of result.answers) {
      if (!recordedThisChainRef.current.has(a.word.id)) {
        recordWordResult(a.word.id, a.isCorrect)
        recordedThisChainRef.current.add(a.word.id)
      }

      const g = a.word.groupIndex
      if (g == null) continue
      const entry = byGroup.get(g) ?? { correct: 0, total: 0 }
      entry.total += 1
      if (a.isCorrect) entry.correct += 1
      byGroup.set(g, entry)
    }
    for (const [groupIndex, { correct, total }] of byGroup) {
      recordGroupResult(groupIndex, correct, total)
    }
    if (byGroup.size === 1) {
      setLastPracticedGroup([...byGroup.keys()][0])
    }

    setRoundResult(result)
    setStage('results')
  }

  function handlePlayAgain() {
    setPracticeWords(refreshWords(practiceWords))
    setRoundKey((k) => k + 1)
    setStage('playing')
  }

  const usedGroupIndices = [...new Set(practiceWords.map((w) => w.groupIndex).filter((i) => i != null))]
  const singleGroupIndex = usedGroupIndices.length === 1 ? usedGroupIndices[0] : null
  const allGroups = !useBufferedQuiz && singleGroupIndex != null ? getGroups(getWords()) : []
  const nextGroup = !useBufferedQuiz && singleGroupIndex != null ? allGroups.find((g) => g.index === singleGroupIndex + 1) : null
  const prevGroup = !useBufferedQuiz && singleGroupIndex != null ? allGroups.find((g) => g.index === singleGroupIndex - 1) : null
  const hasNext = !!nextGroup
  const hasPrev = !!prevGroup

  function handleNextGroup() {
    if (!nextGroup) return
    const words = nextGroup.words.map((w) => ({ ...w, groupIndex: nextGroup.index }))
    startRound(words, `קבוצה ${nextGroup.index}`)
  }

  function handlePrevGroup() {
    if (!prevGroup) return
    const words = prevGroup.words.map((w) => ({ ...w, groupIndex: prevGroup.index }))
    startRound(words, `קבוצה ${prevGroup.index}`)
  }

  function handleMistakesOnly() {
    const mistakeWords = roundResult.answers.filter((a) => !a.isCorrect).map((a) => a.word)
    if (mistakeWords.length === 0) return
    setUseBufferedQuiz(false)
    startRound(refreshWords(mistakeWords), MISTAKES_LABEL)
  }

  if (!ready) {
    return (
      <div className="game-shell">
        <div className="wizard">
          <p className="summary-line">טוען מילון...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`game-shell ${stage === 'manageDictionary' ? 'wide' : ''}`}>
      {stage === 'groupSelect' && (
        <GroupSelect
          onManageDictionary={() => setStage('manageDictionary')}
          onStart={handleStart}
          onOpenMistakes={() => setStage('mistakesList')}
        />
      )}
      {stage === 'manageDictionary' && (
        <DictionaryManager onBack={() => setStage('groupSelect')} onExit={onExit} />
      )}
      {stage === 'mistakesList' && (
        <MistakesList onBack={() => setStage('groupSelect')} onStartPractice={handleStartMistakes} />
      )}
      {stage === 'playing' && (
        <GamePlay
          key={roundKey}
          words={practiceWords}
          groupLabel={practiceLabel}
          bufferedRetry={useBufferedQuiz}
          progressSaveThreshold={progressSaveThreshold}
          onFinish={handleFinish}
          onProgressSave={useBufferedQuiz ? handleProgressSave : undefined}
          onExitQuiz={() => setStage('groupSelect')}
          onNextGroup={hasNext ? handleNextGroup : null}
          onPrevGroup={hasPrev ? handlePrevGroup : null}
        />
      )}
      {stage === 'results' && (
        <Results
          answers={roundResult.answers}
          elapsedMs={roundResult.elapsedMs}
          onPlayAgain={handlePlayAgain}
          onNextGroup={hasNext ? handleNextGroup : null}
          onMistakesOnly={handleMistakesOnly}
          onNewGroups={() => setStage('groupSelect')}
        />
      )}
    </div>
  )
}
