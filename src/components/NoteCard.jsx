import { useEffect, useRef, useState } from 'react'

function NoteCard({ note, onOpen, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

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
      className="folder-card note-card"
      onClick={handleOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleOpen()}
    >
      <div className="note-card-illustration" aria-hidden="true">
        <span className="note-card-icon">📝</span>
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
