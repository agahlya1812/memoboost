import { useEffect, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

function NoteEditor({ note, onSave, onClose }) {
  const [title, setTitle] = useState(note?.title || '')

  const editor = useEditor({
    extensions: [StarterKit],
    content: note?.content || '',
  })

  useEffect(() => {
    setTitle(note?.title || '')
    if (editor) {
      editor.commands.setContent(note?.content || '')
    }
  }, [note?.id])

  const handleSave = () => {
    if (!editor) return
    onSave({
      title: title.trim() || 'Note sans titre',
      content: editor.getHTML()
    })
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') onClose()
  }

  return (
    <div className="note-editor-overlay" role="dialog" aria-modal="true" onKeyDown={handleKeyDown}>
      <div className="note-editor-backdrop" onClick={onClose} />
      <div className="note-editor-panel">
        <div className="note-editor-header">
          <input
            className="note-editor-title"
            type="text"
            placeholder="Titre de la note"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
          <button type="button" className="note-editor-close" onClick={onClose} aria-label="Fermer">×</button>
        </div>

        <div className="note-editor-toolbar">
          <button
            type="button"
            className={editor?.isActive('bold') ? 'active' : ''}
            onClick={() => editor?.chain().focus().toggleBold().run()}
            title="Gras"
          >
            <strong>G</strong>
          </button>
          <button
            type="button"
            className={editor?.isActive('italic') ? 'active' : ''}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            title="Italique"
          >
            <em>I</em>
          </button>
          <button
            type="button"
            className={editor?.isActive('strike') ? 'active' : ''}
            onClick={() => editor?.chain().focus().toggleStrike().run()}
            title="Barré"
          >
            <s>S</s>
          </button>
          <span className="note-editor-toolbar-sep" />
          <button
            type="button"
            className={editor?.isActive('heading', { level: 1 }) ? 'active' : ''}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
            title="Titre 1"
          >
            H1
          </button>
          <button
            type="button"
            className={editor?.isActive('heading', { level: 2 }) ? 'active' : ''}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            title="Titre 2"
          >
            H2
          </button>
          <span className="note-editor-toolbar-sep" />
          <button
            type="button"
            className={editor?.isActive('bulletList') ? 'active' : ''}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            title="Liste à puces"
          >
            • Liste
          </button>
          <button
            type="button"
            className={editor?.isActive('orderedList') ? 'active' : ''}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            title="Liste numérotée"
          >
            1. Liste
          </button>
          <span className="note-editor-toolbar-sep" />
          <button
            type="button"
            className={editor?.isActive('blockquote') ? 'active' : ''}
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            title="Citation"
          >
            ❝
          </button>
          <button
            type="button"
            className={editor?.isActive('code') ? 'active' : ''}
            onClick={() => editor?.chain().focus().toggleCode().run()}
            title="Code"
          >
            {'</>'}
          </button>
        </div>

        <EditorContent editor={editor} className="note-editor-content" />

        <div className="note-editor-footer">
          <button type="button" className="note-editor-btn note-editor-btn--cancel" onClick={onClose}>
            Annuler
          </button>
          <button type="button" className="note-editor-btn note-editor-btn--save" onClick={handleSave}>
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  )
}

export default NoteEditor
