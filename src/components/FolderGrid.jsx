import FolderCard from './FolderCard'

function FolderGrid({
  folders,
  onOpen,
  onEdit,
  onDelete,
  emptyMessage = 'Aucun dossier a afficher ici.',
  variant = 'folder'
}) {
  const baseClassName = ['folder-grid', variant !== 'folder' ? `folder-grid--${variant}` : '']
    .filter(Boolean)
    .join(' ')

  if (!folders.length) {
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
    </section>
  )
}

export default FolderGrid
