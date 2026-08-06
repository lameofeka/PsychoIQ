import { useEffect, useState } from 'react'
import TemplateGame from './TemplateGame'
import SynonymsGame from './SynonymsGame'
import { loadTemplateData, loadSynonymData } from './storage'

const ACTIVITIES = [
  {
    id: 'template',
    title: 'טמפלייט',
    description: 'תרגול הקלדת משפטי הטמפלייט ברצף ולפי הסדר',
    icon: '≡',
    manageLabel: 'ניהול משפטים',
  },
  {
    id: 'synonyms',
    title: 'מילים נרדפות',
    description: 'תרגול מילים נרדפות בשפה גבוהה למילים פשוטות',
    icon: '≈',
    manageLabel: 'ניהול מילים',
  },
]

export default function EssayGame({ onPhaseChange }) {
  const [ready, setReady] = useState(false)
  const [activity, setActivity] = useState(null)
  const [initialStage, setInitialStage] = useState('practice')

  useEffect(() => {
    Promise.all([loadTemplateData(), loadSynonymData()]).then(() => setReady(true))
  }, [])

  useEffect(() => {
    onPhaseChange?.(activity === null ? 'inline' : 'full')
  }, [activity])

  function open(id, stage) {
    setInitialStage(stage)
    setActivity(id)
  }

  if (!ready) {
    return (
      <div className="wizard">
        <p className="summary-line">טוען...</p>
      </div>
    )
  }

  if (activity === 'template') {
    return <TemplateGame initialStage={initialStage} onExit={() => setActivity(null)} />
  }

  if (activity === 'synonyms') {
    return <SynonymsGame initialStage={initialStage} onExit={() => setActivity(null)} />
  }

  return (
    <div className="wizard">
      <h2>חיבור</h2>

      <div className="game-menu essay-activity-menu">
        {ACTIVITIES.map((a) => (
          <div key={a.id} className="essay-activity-block">
            <button className="game-card" onClick={() => open(a.id, 'practice')}>
              <span className="game-card-icon">{a.icon}</span>
              <span className="game-card-title">{a.title}</span>
              <span className="game-card-desc">{a.description}</span>
            </button>
            <button className="link-btn essay-manage-link" onClick={() => open(a.id, 'manage')}>
              {a.manageLabel}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
