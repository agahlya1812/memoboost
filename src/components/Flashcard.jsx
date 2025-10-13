import { useEffect, useRef, useState } from 'react'
import { DEFAULT_COLOR, PASTEL_COLORS } from '../constants/palette'

const STATUS_LABELS = {
  unknown: 'À évaluer',
  review: 'À revoir',
  known: 'Maîtrisée'
}

function Flashcard({ card, onEdit, onDelete, onEvaluate, onImageUpload, variant = 'default' }) {
  const palette = PASTEL_COLORS[card.categoryColor] || PASTEL_COLORS[DEFAULT_COLOR]
  const status = card.masteryStatus || 'unknown'
  const [flipped, setFlipped] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [imageMenuOpen, setImageMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const imageMenuRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (!menuOpen && !imageMenuOpen) {
      return
    }

    const closeOnOutside = (event) => {
      if (!menuRef.current && !imageMenuRef.current) {
        return
      }
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
      if (imageMenuRef.current && !imageMenuRef.current.contains(event.target)) {
        setImageMenuOpen(false)
      }
    }

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        setImageMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.removeEventListener('mousedown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [menuOpen, imageMenuOpen])

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

  const handleToggleImageMenu = (event) => {
    event.stopPropagation()
    setImageMenuOpen((value) => !value)
  }

  const handleImageUpload = (event) => {
    event.stopPropagation()
    setImageMenuOpen(false)
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFileChange = (event) => {
    const file = event.target.files && event.target.files[0]
    if (file && onImageUpload) {
      onImageUpload(card, file)
    }
    // Reset the input
    event.target.value = ''
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
          <div className="flashcard-actions">
            <div className="flashcard-image-menu" ref={imageMenuRef}>
              <button
                type="button"
                className="flashcard-image-trigger"
                aria-haspopup="true"
                aria-expanded={imageMenuOpen}
                onClick={handleToggleImageMenu}
                title="Ajouter une image"
              >
                📷
              </button>
              {imageMenuOpen && (
                <div className="flashcard-image-popover">
                  <button type="button" className="flashcard-image-item" onClick={handleImageUpload}>
                    Ajouter une image
                  </button>
                </div>
              )}
            </div>
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
        </div>
      </header>

      <div className="flashcard-body">
        <span className="flashcard-side-title">{flipped ? 'Réponse' : 'Question'}</span>
        <p>{flipped ? card.answer : card.question}</p>
        {card.imageUrl && (
          <div className="flashcard-image">
            <img 
              src={card.imageUrl} 
              alt="Image de la carte" 
              onLoad={() => console.log('Image chargée avec succès')}
              onError={() => console.log('Erreur de chargement de l\'image')}
            />
            {card.imageUrl.startsWith('blob:') && (
              <div className="flashcard-image-loading">
                <span>Chargement...</span>
              </div>
            )}
          </div>
        )}
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
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </article>
  )
}

export default Flashcard
