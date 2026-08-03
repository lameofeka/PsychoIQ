import { useState } from 'react'
import TemplateGame from './TemplateGame'
import SynonymsGame from './SynonymsGame'

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

export default function EssayGame({ onExit }) {
  const [activity, setActivity] = useState(null)
  const [initialStage, setInitialStage] = useState('practice')

  function open(id, stage) {
    setInitialStage(stage)
    setActivity(id)
  }

  if (activity === 'template') {
    return <TemplateGame initialStage={initialStage} onExit={() => setActivity(null)} />
  }

  if (activity === 'synonyms') {
    return <SynonymsGame initialStage={initialStage} onExit={() => setActivity(null)} />
  }

  return (
    <div className="wizard">
      <div className="wizard-topbar">
        <button className="icon-back-btn" onClick={onExit} aria-label="לתפריט הראשי">
          →
        </button>
      </div>

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
