import { useEffect, useRef, useState } from 'react'
import Flashcard from './Flashcard'
import { exportEnvelopeToPdf, importPdfToText } from '../utils/pdf'
import { DEFAULT_COLOR, PASTEL_COLORS } from '../constants/palette'
import { isSupabaseEnabled, supabase } from '../services/supabaseClient'
import { processPDFAndGenerateCards } from '../services/aiService'
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
  onImageUpload,
  onAIGenerate,
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
  const [showAIModal, setShowAIModal] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiPdfFile, setAiPdfFile] = useState(null)
  const [aiDragOver, setAiDragOver] = useState(false)
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
        const scale = 1.3
        const viewport = page.getViewport({ scale })
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        canvas.width = viewport.width
        canvas.height = viewport.height
        const wrapper = document.createElement('div')
        wrapper.style.display = 'inline-block'
        wrapper.style.boxShadow = '0 6px 24px rgba(0,0,0,0.12)'
        wrapper.style.borderRadius = '8px'
        wrapper.style.overflow = 'hidden'
        wrapper.appendChild(canvas)
        pdfContainerRef.current.appendChild(wrapper)
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

  const handleAIGenerate = () => {
    setShowAIModal(true)
  }

  const handleAIClose = () => {
    setShowAIModal(false)
    setAiGenerating(false)
    setAiPdfFile(null)
    setAiDragOver(false)
  }

  const handleAIFileSelect = (file) => {
    if (file && file.type === 'application/pdf') {
      setAiPdfFile(file)
    } else {
      alert('Veuillez sélectionner un fichier PDF valide')
    }
  }

  const handleAIDragOver = (e) => {
    e.preventDefault()
    setAiDragOver(true)
  }

  const handleAIDragLeave = (e) => {
    e.preventDefault()
    setAiDragOver(false)
  }

  const handleAIDrop = (e) => {
    e.preventDefault()
    setAiDragOver(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleAIFileSelect(files[0])
    }
  }

  const handleAISubmit = async () => {
    if (!aiPdfFile) return
    
    setAiGenerating(true)
    try {
      // Traiter le PDF avec l'IA
      const result = await processPDFAndGenerateCards(aiPdfFile, folder.id, {
        numberOfCards: 10,
        difficulty: 'intermediate'
      })
      
      console.log('Cartes générées:', result)
      
      // Notifier le composant parent
      if (onAIGenerate) {
        onAIGenerate(result)
      }
      
      setShowAIModal(false)
    } catch (error) {
      console.error('Erreur lors de la génération IA:', error)
      alert(`Erreur lors de la génération des cartes: ${error.message}`)
    } finally {
      setAiGenerating(false)
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
            <button type="button" className="flashcard-envelope-action ai" onClick={handleAIGenerate}>
              🤖 IA - Générer des cartes
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
              onImageUpload={onImageUpload}
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
              <div ref={pdfContainerRef} style={{ flex: 1, overflow: 'auto', background: '#ffffff', padding: 16, display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }} />
            </div>
          </div>
        )}
        
        {/* Modal IA */}
        {showAIModal && (
          <div className="ai-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
            <div className="ai-modal" style={{ background: '#ffffff', borderRadius: '16px', padding: '2rem', maxWidth: '500px', width: '90%', maxHeight: '80vh', overflow: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700' }}>🤖 Génération IA de cartes</h3>
                <button 
                  type="button" 
                  onClick={handleAIClose}
                  style={{ border: 'none', background: 'transparent', fontSize: '1.5rem', cursor: 'pointer' }}
                  disabled={aiGenerating}
                >
                  ×
                </button>
              </div>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ margin: '0 0 1rem 0', color: '#666' }}>
                  Importez votre cours en PDF et l'IA générera automatiquement des cartes de révision avec questions et réponses.
                </p>
                
                <div 
                  style={{ 
                    border: `2px dashed ${aiDragOver ? '#6CBDBA' : '#ddd'}`, 
                    borderRadius: '8px', 
                    padding: '2rem', 
                    textAlign: 'center', 
                    background: aiDragOver ? '#f0f9ff' : '#f9f9f9',
                    transition: 'all 0.2s ease'
                  }}
                  onDragOver={handleAIDragOver}
                  onDragLeave={handleAIDragLeave}
                  onDrop={handleAIDrop}
                >
                  {aiPdfFile ? (
                    <div>
                      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📄</div>
                      <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600' }}>{aiPdfFile.name}</p>
                      <p style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: '#666' }}>
                        {(aiPdfFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <button 
                        type="button"
                        onClick={() => setAiPdfFile(null)}
                        style={{ 
                          background: 'transparent', 
                          color: '#666', 
                          border: '1px solid #ddd', 
                          padding: '0.5rem 1rem', 
                          borderRadius: '6px', 
                          cursor: 'pointer',
                          fontSize: '0.875rem'
                        }}
                        disabled={aiGenerating}
                      >
                        Changer de fichier
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📄</div>
                      <p style={{ margin: '0 0 1rem 0', fontWeight: '600' }}>Glissez-déposez votre PDF ici</p>
                      <p style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: '#666' }}>
                        Formats supportés: PDF (max 10MB)
                      </p>
                      <button 
                        type="button"
                        onClick={() => document.getElementById('ai-file-input')?.click()}
                        style={{ 
                          background: '#6CBDBA', 
                          color: 'white', 
                          border: 'none', 
                          padding: '0.75rem 1.5rem', 
                          borderRadius: '6px', 
                          cursor: 'pointer',
                          fontWeight: '600'
                        }}
                        disabled={aiGenerating}
                      >
                        Sélectionner un fichier
                      </button>
                      <input
                        id="ai-file-input"
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => handleAIFileSelect(e.target.files[0])}
                        style={{ display: 'none' }}
                      />
                    </div>
                  )}
                </div>
              </div>
              
              {aiGenerating && (
                <div style={{ textAlign: 'center', padding: '1rem' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🤖</div>
                  <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600' }}>L'IA analyse votre cours...</p>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#666' }}>
                    Génération des cartes en cours, veuillez patienter.
                  </p>
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button 
                  type="button"
                  onClick={handleAIClose}
                  style={{ 
                    background: 'transparent', 
                    color: '#666', 
                    border: '1px solid #ddd', 
                    padding: '0.75rem 1.5rem', 
                    borderRadius: '6px', 
                    cursor: 'pointer'
                  }}
                  disabled={aiGenerating}
                >
                  Annuler
                </button>
                <button 
                  type="button"
                  onClick={handleAISubmit}
                  style={{ 
                    background: aiPdfFile ? '#6CBDBA' : '#ccc', 
                    color: 'white', 
                    border: 'none', 
                    padding: '0.75rem 1.5rem', 
                    borderRadius: '6px', 
                    cursor: aiPdfFile ? 'pointer' : 'not-allowed',
                    fontWeight: '600'
                  }}
                  disabled={aiGenerating || !aiPdfFile}
                >
                  {aiGenerating ? 'Génération...' : 'Générer les cartes'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default FlashcardEnvelope
