import { useEffect, useRef, useState } from 'react'
import Flashcard from './Flashcard'
import { exportEnvelopeToPdf, importPdfToText } from '../utils/pdf'
import { DEFAULT_COLOR, PASTEL_COLORS } from '../constants/palette'
import { isSupabaseEnabled, supabase } from '../services/supabaseClient'
import * as pdfjsLib from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.mjs?url'

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
      if (!isSupabaseEnabled) {
        const pages = await importPdfToText(file)
        const text = pages.join('\n\n')
        alert(`PDF importé (local). Longueur texte: ${text.length} caractères.`)
        return
      }
      setBusy(true)
      const path = `${folder.id}.pdf`
      await supabase.storage.from('revisions').upload(path, file, { upsert: true, contentType: file.type || 'application/pdf' })
      const { data } = supabase.storage.from('revisions').getPublicUrl(path)
      setHasRevisionPdf(true)
      setPdfUrl(data?.publicUrl || '')
    } catch (error) {
      console.error('Import PDF impossible', error)
      alert("Import PDF impossible pour le moment.")
    } finally {
      event.target.value = ''
      setBusy(false)
    }
  }

  const fileInputRef = useRef(null)
  const [hasRevisionPdf, setHasRevisionPdf] = useState(false)
  const [pdfUrl, setPdfUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPdf, setShowPdf] = useState(false)
  const pdfContainerRef = useRef(null)
  const openFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  useEffect(() => {
    if (!isSupabaseEnabled || !folder?.id) {
      setHasRevisionPdf(false)
      setPdfUrl('')
      return
    }
    const check = async () => {
      try {
        const path = `${folder.id}.pdf`
        const { data } = await supabase.storage.from('revisions').list('', { search: path })
        const exists = Array.isArray(data) && data.some((o) => o.name === `${folder.id}.pdf`)
        setHasRevisionPdf(Boolean(exists))
        if (exists) {
          const { data: pub } = supabase.storage.from('revisions').getPublicUrl(path)
          setPdfUrl(pub?.publicUrl || '')
        } else {
          setPdfUrl('')
        }
      } catch {
        setHasRevisionPdf(false)
        setPdfUrl('')
      }
    }
    check()
  }, [folder?.id])

  // Rendu du PDF dans un canvas (supprime toute barre d'outils)
  useEffect(() => {
    const render = async () => {
      if (!showPdf || !pdfUrl || !pdfContainerRef.current) return
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc
        const loadingTask = pdfjsLib.getDocument(pdfUrl)
        const pdf = await loadingTask.promise
        // Nettoyer
        pdfContainerRef.current.innerHTML = ''
        const page = await pdf.getPage(1)
        const viewport = page.getViewport({ scale: 1.2 })
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        canvas.width = viewport.width
        canvas.height = viewport.height
        pdfContainerRef.current.appendChild(canvas)
        await page.render({ canvasContext: context, viewport }).promise
      } catch (e) {
        // fallback: ouvrir dans iframe si rendu canvas échoue
        const iframe = document.createElement('iframe')
        iframe.title = 'Fiche de révision'
        iframe.style.width = '100%'
        iframe.style.height = '100%'
        iframe.style.border = 'none'
        iframe.src = (pdfUrl || '') + '#toolbar=0&navpanes=0&scrollbar=1'
        pdfContainerRef.current.innerHTML = ''
        pdfContainerRef.current.appendChild(iframe)
      }
    }
    render()
  }, [showPdf, pdfUrl])

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
            {hasRevisionPdf ? (
              <button type="button" className="flashcard-envelope-action secondary" onClick={() => setShowPdf(true)}>
                Fiche de révision
              </button>
            ) : (
              <button type="button" className="flashcard-envelope-action secondary" onClick={openFilePicker} disabled={busy}>Importer PDF</button>
            )}
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
        {showPdf && (
          <div className="pdf-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.98)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120 }}>
            <div className="pdf-panel" style={{ position: 'relative', width: 'min(1100px, 96vw)', height: 'min(92vh, 880px)', background: '#ffffff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 24px 64px rgba(15,23,42,0.18)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid rgba(0,0,0,0.08)', background: '#ffffff' }}>
                <strong style={{ fontSize: '0.95rem' }}>{folder.name} — Fiche de révision</strong>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={async () => {
                    if (!isSupabaseEnabled || !pdfUrl) { setShowPdf(false); return }
                    const ok = window.confirm('Supprimer le PDF de cette enveloppe ?')
                    if (!ok) return
                    try {
                      setBusy(true)
                      const path = `${folder.id}.pdf`
                      await supabase.storage.from('revisions').remove([path])
                      setHasRevisionPdf(false)
                      setPdfUrl('')
                      setShowPdf(false)
                    } catch (e) {
                      alert("Suppression impossible pour le moment.")
                    } finally {
                      setBusy(false)
                    }
                  }}
                  style={{ border: 'none', background: '#ffe5e5', color: '#8c2f39', fontWeight: 700, padding: '8px 12px', borderRadius: 8, cursor: 'pointer' }}>Supprimer</button>
                  <button type="button" aria-label="Fermer" onClick={() => setShowPdf(false)}
                    style={{ border: 'none', background: '#ffe5e5', color: '#8c2f39', width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', fontSize: 18, fontWeight: 800 }}>×</button>
                </div>
              </div>
              <div ref={pdfContainerRef} style={{ flex: 1, overflow: 'auto', background: '#ffffff', padding: 16 }} />
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default FlashcardEnvelope
