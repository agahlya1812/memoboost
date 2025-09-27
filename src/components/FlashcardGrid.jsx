import Flashcard from './Flashcard'

function FlashcardGrid({ cards, onEditCard, onDeleteCard, variant = 'default', emptyMessage = 'Aucune carte ne correspond a la recherche.' }) {
  if (!cards.length) {
    return (
      <section className="flashcard-grid empty">
        <p>{emptyMessage}</p>
      </section>
    )
  }

  return (
    <section className="flashcard-grid">
      {cards.map((card) => (
        <Flashcard key={card.id} card={card} onEdit={onEditCard} onDelete={onDeleteCard} variant={variant} />
      ))}
    </section>
  )
}

export default FlashcardGrid
