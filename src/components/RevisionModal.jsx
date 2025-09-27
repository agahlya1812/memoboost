import { useMemo } from 'react'

const STATUS_LABELS = {
  unknown: 'À évaluer',
  review: 'À revoir',
  known: 'Maîtrisée'
}


function RevisionModal({ session, onClose, onReveal, onEvaluate }) {
  const { cards, currentIndex, revealed, answered, completed, envelopeName } = session
  const total = cards.length
  const currentCard = cards[currentIndex] || null
  const displayIndex = Math.min(currentIndex + 1, total)
  const progressValue = total ? Math.round((answered / total) * 100) : 0

  const masteryCounts = useMemo(() => {
    return cards.reduce(
      (acc, card) => {
        const status = card.masteryStatus || 'unknown'
        acc[status] = (acc[status] || 0) + 1
        return acc
      },
      { unknown: 0, review: 0, known: 0 }
    )
  }, [cards])

  const subtitle = total > 1 ? `${total} cartes à réviser` : '1 carte à réviser'

  if (!total) {
    return null
  }

  return (
    <div className="revision-overlay" role="dialog" aria-modal="true" aria-label={`Révision - ${envelopeName || ''}`}>
      <div className="revision-backdrop" />
      <div className="revision-panel">
        <header className="revision-header">
          <div className="revision-header-left">
            <h2>{envelopeName || 'Révision'}</h2>
            <p>{subtitle}</p>
          </div>
          <div className="revision-header-right">
            <span className="revision-progress">{answered}/{total}</span>
            <button type="button" className="revision-close" onClick={onClose} aria-label="Fermer la révision">
              ×
            </button>
          </div>
        </header>

        <div
          className="revision-progressbar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressValue}
          aria-valuetext={`${answered} sur ${total}`}
        >
          <span className="revision-progressbar-fill" style={{ width: `${progressValue}%` }} />
        </div>

        {!completed && currentCard && (
          <div className="revision-body">
            <div className="revision-card">
              <span className="revision-status">{STATUS_LABELS[currentCard.masteryStatus || 'unknown']}</span>
              <h3 className="revision-question">{currentCard.question}</h3>
              {revealed ? (
                <p className="revision-answer">{currentCard.answer}</p>
              ) : (
                <p className="revision-instruction">Cliquez sur « Voir la réponse » pour comparer.</p>
              )}
            </div>

            <div className="revision-actions">
              {!revealed ? (
                <button type="button" className="revision-primary" onClick={onReveal}>
                  Voir la réponse
                </button>
              ) : (
                <>
                  <button type="button" className="revision-success" onClick={() => onEvaluate('known')}>
                    Je sais
                  </button>
                  <button type="button" className="revision-warning" onClick={() => onEvaluate('review')}>
                    À revoir
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {completed && (
          <div className="revision-summary">
            <h3>Session terminée</h3>
            <p>Cartes revues : {answered}/{total}</p>
            <ul>
              <li>Maîtrisées : {masteryCounts.known}</li>
              <li>À revoir : {masteryCounts.review}</li>
              <li>À évaluer : {masteryCounts.unknown}</li>
            </ul>
            <button type="button" className="revision-primary" onClick={onClose}>
              Terminer
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default RevisionModal
