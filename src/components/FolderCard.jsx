import { useEffect, useRef, useState } from 'react'
import { DEFAULT_COLOR, PASTEL_COLORS } from '../constants/palette'

function FolderCard({ folder, onOpen, onEdit, onDelete, variant = 'folder' }) {
  const palette = PASTEL_COLORS[folder.color] || PASTEL_COLORS[DEFAULT_COLOR]
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  const handleOpen = () => {
    if (onOpen) {
      onOpen(folder.id)
    }
  }

  const handleEdit = (event) => {
    event.stopPropagation()
    setMenuOpen(false)
    if (onEdit) {
      onEdit(folder)
    }
  }

  const handleDelete = (event) => {
    event.stopPropagation()
    setMenuOpen(false)
    if (onDelete) {
      onDelete(folder)
    }
  }

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

  const overlay = `linear-gradient(140deg, ${palette.bg} 0%, ${palette.accent} 100%)`

  const envelopeIconMap = {
    red: 'rouge',
    orange: 'orange',
    yellow: 'jaune',
    green: 'vert',
    blue: 'bleu',
    violet: 'violet',
    pink: 'rose',
    gray: 'gris'
  }

  const colorKey = envelopeIconMap[folder.color] ? envelopeIconMap[folder.color] : envelopeIconMap.blue
  const envelopeIcon = `${import.meta.env.BASE_URL}icon-enveloppe-${colorKey}.png?v=${Date.now()}`

  const cardClassName = variant === 'folder' ? 'folder-card' : `folder-card folder-card--${variant}`
  
  // Pour les dossiers, utiliser l'icône colorée basée sur la couleur du dossier
  const folderIconMap = {
    red: 'rouge',
    orange: 'orange',
    yellow: 'jaune',
    green: 'vert',
    blue: 'bleu',
    violet: 'violet',
    pink: 'rose',
    gray: 'gris'
  }
  
  const folderColorKey = folderIconMap[folder.color] ? folderIconMap[folder.color] : folderIconMap.blue
  const folderIcon = `${import.meta.env.BASE_URL}icon-dossier-${folderColorKey}.png?v=${Date.now()}`
  
  const iconSrc = variant === 'envelope' ? envelopeIcon : folderIcon

  const cardStyles = {
    '--folder-overlay': overlay,
    '--folder-title': palette.fg,
    '--folder-border': palette.accent
  }

  return (
    <article
      className={cardClassName}
      style={cardStyles}
      onClick={handleOpen}
      role="button"
      tabIndex={0}
    >
      <div className={`folder-illustration folder-illustration--${variant}`} aria-hidden="true">
        <img src={iconSrc} alt="" className="folder-illustration-image" loading="lazy" />
      </div>
      <div className="folder-info">
        <span className="folder-name">{folder.name}</span>
        <div className="folder-menu" ref={menuRef} onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            className="folder-trigger"
            aria-haspopup="true"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
          >
            ⋮
          </button>
          {menuOpen && (
            <div className="folder-menu-popover">
              <button type="button" className="folder-menu-button" onClick={handleEdit}>
                Renommer
              </button>
              <button type="button" className="folder-menu-button danger" onClick={handleDelete}>
                Supprimer
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

export default FolderCard
