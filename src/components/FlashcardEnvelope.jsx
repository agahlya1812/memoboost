import { useRef } from 'react'
import Flashcard from './Flashcard'
import { exportEnvelopeToPdf, importPdfToText } from '../utils/pdf'
import { DEFAULT_COLOR, PASTEL_COLORS } from '../constants/palette'

function FlashcardEnvelope({
  folder,
  cards,
  filter = 'all',
  onChangeFilter,
  onEditCard,
  onDeleteCard,
  onEvaluateCard,
  onAddCard,
  onStartRevision,
  onClose
}) {
  if (!folder) {
    return null
  }

  const palette = PASTEL_COLORS[folder.color] || PASTEL_COLORS[DEFAULT_COLOR]
  const cardCountLabel = cards.length === 0
    ? 'Aucune carte'
    : `${cards.length} ${cards.length > 1 ? 'cartes' : 'carte'}`

  const filterOptions = [
    { value: 'all', label: 'Toutes' },
    { value: 'review', label: 'À revoir' },
    { value: 'known', label: 'Je sais' }
  ]

  const handleAdd = () => {
    if (onAddCard) {
      onAddCard(folder)
    }
  }

  const handleStartRevision = () => {
    if (onStartRevision) {
      onStartRevision()
    }
  }

  const handleExportPdf = () => {
    try {
      exportEnvelopeToPdf(folder, cards)
    } catch (error) {
      console.error('Export PDF impossible', error)
      alert("Export PDF impossible pour le moment.")
    }
  }

  const handleImportPdf = async (event) => {
    const file = event.target.files && event.target.files[0]
    if (!file) return
    try {
      const pages = await importPdfToText(file)
      const text = pages.join('\n\n')
      alert(`PDF importé. Longueur texte: ${text.length} caractères.\n\nCopiez/collez dans vos cartes.`)
    } catch (error) {
      console.error('Import PDF impossible', error)
      alert("Import PDF impossible pour le moment.")
    } finally {
      event.target.value = ''
    }
  }

  const fileInputRef = useRef(null)
  const openFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFilterChange = (value) => {
    if (onChangeFilter) {
      onChangeFilter(value)
    }
  }

  const handleEvaluate = (card, masteryStatus) => {
    if (onEvaluateCard) {
      onEvaluateCard(card, masteryStatus)
    }
  }

  return (
    <section className="flashcard-envelope">
      <header className="flashcard-envelope-header" style={{ backgroundColor: palette.accent }}>
        <h2 className="flashcard-envelope-title">{folder.name}</h2>
        <div className="flashcard-envelope-header-tools">
          <div className="flashcard-envelope-actions">
            <button type="button" className="flashcard-envelope-action" onClick={handleStartRevision}>
              Révision
            </button>
            <button type="button" className="flashcard-envelope-action secondary" onClick={handleExportPdf}>
              Exporter en PDF
            </button>
            <button type="button" className="flashcard-envelope-action secondary" onClick={openFilePicker}>
              Importer PDF
            </button>
            <input ref={fileInputRef} type="file" accept="application/pdf" onChange={handleImportPdf} style={{ display: 'none' }} />
          </div>
          <span className="flashcard-envelope-count">{cardCountLabel}</span>
          <button type="button" className="flashcard-envelope-close" onClick={onClose} aria-label="Fermer l'enveloppe">
            ×
          </button>
        </div>
      </header>
      <div className="flashcard-envelope-content">
        <div className="flashcard-envelope-filters" role="radiogroup" aria-label="Filtrer les cartes">
          {filterOptions.map(({ value, label }) => {
            const isActive = filter === value
            return (
              <button
                key={value}
                type="button"
                className={`flashcard-envelope-filter ${isActive ? 'is-active' : ''}`}
                onClick={() => handleFilterChange(value)}
                aria-pressed={isActive}
              >
                {label}
              </button>
            )
          })}
        </div>
        <div className="flashcard-envelope-grid">
          {cards.map((card) => (
            <Flashcard
              key={card.id}
              card={card}
              onEdit={onEditCard}
              onDelete={onDeleteCard}
              onEvaluate={handleEvaluate}
              variant="envelope"
            />
          ))}
          <button type="button" className="flashcard-add-tile" onClick={handleAdd}>
            <span className="flashcard-add-icon">+</span>
            <p>Ajouter une carte</p>
          </button>
        </div>
      </div>
    </section>
  )
}

export default FlashcardEnvelope
