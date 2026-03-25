import { useState } from 'react'
import { 
  exportToJSON, 
  exportToCSV, 
  importFromJSON, 
  importFromCSV, 
  downloadFile, 
  readUploadedFile 
} from '../utils/importExport'

function ImportExportModal({ isOpen, onClose, onImport, cards, categories }) {
  const [activeTab, setActiveTab] = useState('export')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  if (!isOpen) return null

  const handleExportJSON = () => {
    try {
      const jsonData = exportToJSON(cards, categories)
      const filename = `memoboost-export-${new Date().toISOString().split('T')[0]}.json`
      downloadFile(jsonData, filename, 'application/json')
      setSuccess('Export JSON réussi !')
      setError('')
    } catch (err) {
      setError(`Erreur lors de l'export JSON : ${err.message}`)
      setSuccess('')
    }
  }

  const handleExportCSV = () => {
    try {
      const csvData = exportToCSV(cards, categories)
      const filename = `memoboost-export-${new Date().toISOString().split('T')[0]}.csv`
      downloadFile(csvData, filename, 'text/csv')
      setSuccess('Export CSV réussi !')
      setError('')
    } catch (err) {
      setError(`Erreur lors de l'export CSV : ${err.message}`)
      setSuccess('')
    }
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    setIsProcessing(true)
    setError('')
    setSuccess('')

    try {
      const content = await readUploadedFile(file)
      const isJSON = file.name.toLowerCase().endsWith('.json')
      
      let importedData
      if (isJSON) {
        importedData = importFromJSON(content)
      } else {
        importedData = importFromCSV(content)
      }

      if (onImport) {
        await onImport(importedData)
        setSuccess(`Import réussi ! ${importedData.cards.length} cartes et ${importedData.categories.length} dossiers importés.`)
      }
    } catch (err) {
      setError(`Erreur lors de l'import : ${err.message}`)
    } finally {
      setIsProcessing(false)
      event.target.value = '' // Reset file input
    }
  }

  const handleClose = () => {
    setError('')
    setSuccess('')
    setActiveTab('export')
    onClose()
  }

  return (
    <div className="import-export-overlay" role="dialog" aria-modal="true">
      <div className="import-export-backdrop" onClick={handleClose} />
      <div className="import-export-panel">
        <header className="import-export-header">
          <h2>Import / Export</h2>
          <button 
            type="button" 
            className="import-export-close" 
            onClick={handleClose}
            aria-label="Fermer"
          >
            ×
          </button>
        </header>

        <div className="import-export-tabs">
          <button
            type="button"
            className={`import-export-tab ${activeTab === 'export' ? 'active' : ''}`}
            onClick={() => setActiveTab('export')}
          >
            Export
          </button>
          <button
            type="button"
            className={`import-export-tab ${activeTab === 'import' ? 'active' : ''}`}
            onClick={() => setActiveTab('import')}
          >
            Import
          </button>
        </div>

        <div className="import-export-content">
          {activeTab === 'export' && (
            <div className="export-section">
              <h3>Exporter vos données</h3>
              <p>Choisissez le format d'export :</p>
              
              <div className="export-options">
                <button
                  type="button"
                  className="export-button"
                  onClick={handleExportJSON}
                  disabled={!cards.length}
                >
                  <span className="export-icon">📄</span>
                  <div>
                    <strong>Export JSON</strong>
                    <p>Format complet avec toutes les données</p>
                  </div>
                </button>
                
                <button
                  type="button"
                  className="export-button"
                  onClick={handleExportCSV}
                  disabled={!cards.length}
                >
                  <span className="export-icon">📊</span>
                  <div>
                    <strong>Export CSV</strong>
                    <p>Tableau pour Excel/Google Sheets</p>
                  </div>
                </button>
              </div>
              
              {!cards.length && (
                <p className="export-warning">
                  ⚠️ Aucune carte à exporter
                </p>
              )}
            </div>
          )}

          {activeTab === 'import' && (
            <div className="import-section">
              <h3>Importer des données</h3>
              <p>Choisissez un fichier JSON ou CSV :</p>
              
              <div className="import-upload">
                <input
                  type="file"
                  id="import-file"
                  accept=".json,.csv"
                  onChange={handleFileUpload}
                  disabled={isProcessing}
                  style={{ display: 'none' }}
                />
                <label htmlFor="import-file" className="import-button">
                  {isProcessing ? 'Traitement...' : 'Choisir un fichier'}
                </label>
              </div>
              
              <div className="import-info">
                <h4>Formats supportés :</h4>
                <ul>
                  <li><strong>JSON :</strong> Export MemoBoost ou format compatible</li>
                  <li><strong>CSV :</strong> Colonnes : Question, Réponse, Dossier, Statut</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="import-export-error">
            {error}
          </div>
        )}

        {success && (
          <div className="import-export-success">
            {success}
          </div>
        )}
      </div>
    </div>
  )
}

export default ImportExportModal
