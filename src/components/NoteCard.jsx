import { useEffect, useRef, useState } from 'react'
import { DEFAULT_COLOR, PASTEL_COLORS } from '../constants/palette'

const COLOR_MAP = {
  red: 'rouge',
  orange: 'orange',
  yellow: 'jaune',
  green: 'vert',
  blue: 'bleu',
  violet: 'violet',
  pink: 'rose',
  gray: 'gris'
}

function NoteCard({ note, color = DEFAULT_COLOR, onOpen, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const palette = PASTEL_COLORS[color] || PASTEL_COLORS[DEFAULT_COLOR]

  const colorKey = COLOR_MAP[color] || COLOR_MAP[DEFAULT_COLOR]
  const iconSrc = `${import.meta.env.BASE_URL}icon-notes-${colorKey}.png`

  const overlay = `linear-gradient(140deg, ${palette.bg} 0%, ${palette.accent} 100%)`
  const cardStyles = {
    '--folder-overlay': overlay,
    '--folder-title': palette.fg,
    '--folder-border': palette.accent
  }

  const handleOpen = () => {
    if (onOpen) onOpen(note)
  }

  const handleDelete = (event) => {
    event.stopPropagation()
    setMenuOpen(false)
    if (onDelete) onDelete(note)
  }

  useEffect(() => {
    if (!menuOpen) return
    const closeOnOutside = (e) => {
      if (!menuRef.current?.contains(e.target)) setMenuOpen(false)
    }
    const closeOnEscape = (e) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [menuOpen])

  return (
    <article
      className="folder-card folder-card--envelope note-card"
      style={cardStyles}
      onClick={handleOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleOpen()}
    >
      <div className="folder-illustration folder-illustration--envelope" aria-hidden="true">
        <img src={iconSrc} alt="" className="folder-illustration-image" loading="lazy" />
      </div>
      <div className="folder-info">
        <span className="folder-name">{note.title || 'Note sans titre'}</span>
        <div className="folder-menu" ref={menuRef} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="folder-trigger"
            aria-haspopup="true"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            ⋮
          </button>
          {menuOpen && (
            <div className="folder-menu-popover">
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

export default NoteCard
