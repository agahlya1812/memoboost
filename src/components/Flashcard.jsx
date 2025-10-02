import { useEffect, useRef, useState } from 'react'
import { DEFAULT_COLOR, PASTEL_COLORS } from '../constants/palette'

const STATUS_LABELS = {
  unknown: 'À évaluer',
  review: 'À revoir',
  known: 'Maîtrisée'
}

function Flashcard({ card, onEdit, onDelete, onEvaluate, variant = 'default' }) {
  const palette = PASTEL_COLORS[card.categoryColor] || PASTEL_COLORS[DEFAULT_COLOR]
  const status = card.masteryStatus || 'unknown'
  const [flipped, setFlipped] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) {
      return
    }

    const closeOnOutside = (event) => {
      if (!menuRef.current) {
        return
      }
      if (!menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
    }

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.removeEventListener('mousedown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [menuOpen])

  const handleEdit = (event) => {
    event.stopPropagation()
    setMenuOpen(false)
    if (onEdit) {
      onEdit(card)
    }
  }

  const handleDelete = (event) => {
    event.stopPropagation()
    setMenuOpen(false)
    if (onDelete) {
      onDelete(card)
    }
  }

  const toggleCard = () => {
    if (menuOpen) {
      return
    }
    setFlipped((value) => !value)
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      toggleCard()
    }
  }

  const handleToggleMenu = (event) => {
    event.stopPropagation()
    setMenuOpen((value) => !value)
  }

  const handleEvaluate = (event, nextStatus) => {
    event.stopPropagation()
    if (onEvaluate) {
      onEvaluate(card, nextStatus)
    }
  }

  const className = ['flashcard', flipped ? 'is-flipped' : '', variant !== 'default' ? `flashcard--${variant}` : '']
    .filter(Boolean)
    .join(' ')

  const cardStyles = {
    '--flashcard-accent': palette.accent,
    '--flashcard-fg': palette.fg,
    '--flashcard-bg': palette.bg
  }

  return (
    <article
      className={className}
      style={cardStyles}
      onClick={toggleCard}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-pressed={flipped}
    >
      <header className="flashcard-header">
        <div className="flashcard-header-left">
          <span className="flashcard-category" style={{ color: palette.fg }}>
            {card.categoryName}
          </span>
          <span className={`flashcard-status flashcard-status--${status}`}>
            {STATUS_LABELS[status] || STATUS_LABELS.unknown}
          </span>
        </div>
        <div className="flashcard-header-tools">
          <span className="flashcard-flip-indicator">{flipped ? 'Réponse' : 'Question'}</span>
          <div className="flashcard-menu" ref={menuRef}>
            <button
              type="button"
              className="flashcard-menu-trigger"
              aria-haspopup="true"
              aria-expanded={menuOpen}
              onClick={handleToggleMenu}
            >
              ⋮
            </button>
            {menuOpen && (
              <div className="flashcard-menu-popover">
                <button type="button" className="flashcard-menu-item" onClick={handleEdit}>
                  Modifier
                </button>
                <button type="button" className="flashcard-menu-item danger" onClick={handleDelete}>
                  Supprimer
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flashcard-body">
        <span className="flashcard-side-title">{flipped ? 'Réponse' : 'Question'}</span>
        <p>{flipped ? card.answer : card.question}</p>
      </div>

      <div className="flashcard-eval">
        <button
          type="button"
          className={`flashcard-eval-button flashcard-eval-button--known ${status === 'known' ? 'is-active' : ''}`}
          onClick={(event) => handleEvaluate(event, 'known')}
        >
          Je sais
        </button>
        <button
          type="button"
          className={`flashcard-eval-button flashcard-eval-button--review ${status === 'review' ? 'is-active' : ''}`}
          onClick={(event) => handleEvaluate(event, 'review')}
        >
          À revoir
        </button>
      </div>
    </article>
  )
}

export default Flashcard
