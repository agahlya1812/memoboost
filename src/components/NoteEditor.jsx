import { useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { Highlight } from '@tiptap/extension-highlight'
import { TextAlign } from '@tiptap/extension-text-align'

const PASTEL_TEXT_COLORS = [
  { label: 'Défaut', value: null },
  { label: 'Rose', value: '#f472b6' },
  { label: 'Rouge', value: '#f87171' },
  { label: 'Orange', value: '#fb923c' },
  { label: 'Jaune', value: '#facc15' },
  { label: 'Vert', value: '#4ade80' },
  { label: 'Turquoise', value: '#2dd4bf' },
  { label: 'Bleu', value: '#60a5fa' },
  { label: 'Violet', value: '#a78bfa' },
]

const PASTEL_HIGHLIGHT_COLORS = [
  { label: 'Aucun', value: null },
  { label: 'Rose', value: '#fce7f3' },
  { label: 'Rouge', value: '#fee2e2' },
  { label: 'Orange', value: '#ffedd5' },
  { label: 'Jaune', value: '#fef9c3' },
  { label: 'Vert', value: '#dcfce7' },
  { label: 'Turquoise', value: '#ccfbf1' },
  { label: 'Bleu', value: '#dbeafe' },
  { label: 'Violet', value: '#ede9fe' },
]

function ColorPicker({ colors, onSelect, onClose, activeColor }) {
  const ref = useRef(null)

  useEffect(() => {
    const close = (e) => { if (!ref.current?.contains(e.target)) onClose() }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [onClose])

  return (
    <div className="note-color-picker" ref={ref}>
      {colors.map((c) => (
        <button
          key={c.label}
          type="button"
          className={`note-color-swatch${activeColor === c.value ? ' active' : ''}`}
          title={c.label}
          onClick={() => { onSelect(c.value); onClose() }}
          style={{ background: c.value || '#e2e8f0', border: c.value === null ? '2px dashed #aaa' : '2px solid transparent' }}
        />
      ))}
    </div>
  )
}

function NoteEditor({ note, onSave, onClose }) {
  const [title, setTitle] = useState(note?.title || '')
  const [showTextColor, setShowTextColor] = useState(false)
  const [showHighlight, setShowHighlight] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: note?.content || '',
  })

  useEffect(() => {
    setTitle(note?.title || '')
    if (editor) editor.commands.setContent(note?.content || '')
  }, [note?.id])

  const handleSave = () => {
    if (!editor) return
    onSave({ title: title.trim() || 'Note sans titre', content: editor.getHTML() })
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') onClose()
  }

  const activeTextColor = editor?.getAttributes('textStyle')?.color || null
  const activeHighlight = editor?.getAttributes('highlight')?.color || null

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
          {/* Formatage */}
          <button type="button" className={editor?.isActive('bold') ? 'active' : ''} onClick={() => editor?.chain().focus().toggleBold().run()} title="Gras"><strong>G</strong></button>
          <button type="button" className={editor?.isActive('italic') ? 'active' : ''} onClick={() => editor?.chain().focus().toggleItalic().run()} title="Italique"><em>I</em></button>
          <button type="button" className={editor?.isActive('strike') ? 'active' : ''} onClick={() => editor?.chain().focus().toggleStrike().run()} title="Barré"><s>S</s></button>

          <span className="note-editor-toolbar-sep" />

          {/* Couleur de texte */}
          <div className="note-toolbar-color-wrapper">
            <button
              type="button"
              className={showTextColor ? 'active' : ''}
              title="Couleur du texte"
              onClick={() => { setShowTextColor((v) => !v); setShowHighlight(false) }}
            >
              <span style={{ borderBottom: `3px solid ${activeTextColor || '#333'}`, lineHeight: 1 }}>A</span>
            </button>
            {showTextColor && (
              <ColorPicker
                colors={PASTEL_TEXT_COLORS}
                activeColor={activeTextColor}
                onClose={() => setShowTextColor(false)}
                onSelect={(color) => {
                  if (color) editor?.chain().focus().setColor(color).run()
                  else editor?.chain().focus().unsetColor().run()
                }}
              />
            )}
          </div>

          {/* Surlignage */}
          <div className="note-toolbar-color-wrapper">
            <button
              type="button"
              className={showHighlight ? 'active' : ''}
              title="Surligner"
              onClick={() => { setShowHighlight((v) => !v); setShowTextColor(false) }}
            >
              <span style={{ background: activeHighlight || 'transparent', padding: '0 2px', borderRadius: 2 }}>✎</span>
            </button>
            {showHighlight && (
              <ColorPicker
                colors={PASTEL_HIGHLIGHT_COLORS}
                activeColor={activeHighlight}
                onClose={() => setShowHighlight(false)}
                onSelect={(color) => {
                  if (color) editor?.chain().focus().setHighlight({ color }).run()
                  else editor?.chain().focus().unsetHighlight().run()
                }}
              />
            )}
          </div>

          <span className="note-editor-toolbar-sep" />

          {/* Titres */}
          <button type="button" className={editor?.isActive('heading', { level: 1 }) ? 'active' : ''} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} title="Titre 1">H1</button>
          <button type="button" className={editor?.isActive('heading', { level: 2 }) ? 'active' : ''} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} title="Titre 2">H2</button>

          <span className="note-editor-toolbar-sep" />

          {/* Listes */}
          <button type="button" className={editor?.isActive('bulletList') ? 'active' : ''} onClick={() => editor?.chain().focus().toggleBulletList().run()} title="Liste à puces">• Liste</button>
          <button type="button" className={editor?.isActive('orderedList') ? 'active' : ''} onClick={() => editor?.chain().focus().toggleOrderedList().run()} title="Liste numérotée">1. Liste</button>

          <span className="note-editor-toolbar-sep" />

          {/* Alignement */}
          <button type="button" className={editor?.isActive({ textAlign: 'left' }) ? 'active' : ''} onClick={() => editor?.chain().focus().setTextAlign('left').run()} title="Aligner à gauche">⬅</button>
          <button type="button" className={editor?.isActive({ textAlign: 'center' }) ? 'active' : ''} onClick={() => editor?.chain().focus().setTextAlign('center').run()} title="Centrer">≡</button>
          <button type="button" className={editor?.isActive({ textAlign: 'justify' }) ? 'active' : ''} onClick={() => editor?.chain().focus().setTextAlign('justify').run()} title="Justifier">☰</button>

          <span className="note-editor-toolbar-sep" />

          {/* Autres */}
          <button type="button" className={editor?.isActive('blockquote') ? 'active' : ''} onClick={() => editor?.chain().focus().toggleBlockquote().run()} title="Citation">❝</button>
          <button type="button" className={editor?.isActive('code') ? 'active' : ''} onClick={() => editor?.chain().focus().toggleCode().run()} title="Code">{'</>'}</button>
        </div>

        <EditorContent editor={editor} className="note-editor-content" />

        <div className="note-editor-footer">
          <button type="button" className="note-editor-btn note-editor-btn--cancel" onClick={onClose}>Annuler</button>
          <button type="button" className="note-editor-btn note-editor-btn--save" onClick={handleSave}>Enregistrer</button>
        </div>
      </div>
    </div>
  )
}

export default NoteEditor
