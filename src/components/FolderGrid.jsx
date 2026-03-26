import FolderCard from './FolderCard'
import NoteCard from './NoteCard'

function FolderGrid({
  folders,
  onOpen,
  onEdit,
  onDelete,
  notes = [],
  noteColor,
  onOpenNote,
  onDeleteNote,
  emptyMessage = 'Aucun dossier a afficher ici.',
  variant = 'folder'
}) {
  const baseClassName = ['folder-grid', variant !== 'folder' ? `folder-grid--${variant}` : '']
    .filter(Boolean)
    .join(' ')

  if (!folders.length && !notes.length) {
    return (
      <section className={`${baseClassName} empty`}>
        <p>{emptyMessage}</p>
      </section>
    )
  }

  return (
    <section className={baseClassName}>
      {folders.map((folder) => (
        <FolderCard
          key={folder.id}
          folder={folder}
          onOpen={onOpen}
          onEdit={onEdit}
          onDelete={onDelete}
          variant={variant}
        />
      ))}
      {notes.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          color={noteColor}
          onOpen={onOpenNote}
          onDelete={onDeleteNote}
        />
      ))}
    </section>
  )
}

export default FolderGrid
