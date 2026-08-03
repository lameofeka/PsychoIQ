export default function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="icon-back-btn modal-close" onClick={onClose} aria-label="סגירה">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
