import { useCallback, useEffect, useMemo, useState } from 'react'
import ItemPanel from './components/ItemPanel'
import FlashcardGrid from './components/FlashcardGrid'
import {
  createCard,
  createCategory,
  deleteCard,
  deleteCategory,
  fetchState,
  updateCard,
  updateCategory
} from './services/api'
import './App.css'

const defaultPanelState = {
  isOpen: false,
  mode: 'add',
  type: 'flashcard',
  item: null
}

function App() {
  const [cards, setCards] = useState([])
  const [categories, setCategories] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [noticeTone, setNoticeTone] = useState('info')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [isSyncing, setIsSyncing] = useState(false)
  const [panelState, setPanelState] = useState(defaultPanelState)

  const fetchAndSetState = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setStatus('loading')
    }

    try {
      const data = await fetchState()
      setCards(data.cards || [])
      setCategories(data.categories || [])
      setError('')
      setStatus('ready')
      return data
    } catch (err) {
      const message = err.message || 'Impossible de charger les donnees.'
      setError(message)
      setStatus('error')
      throw err
    }
  }, [])

  useEffect(() => {
    fetchAndSetState().catch(() => {})
  }, [fetchAndSetState])

  useEffect(() => {
    if (categoryFilter !== 'all' && !categories.some((category) => category.id === categoryFilter)) {
      setCategoryFilter('all')
    }
  }, [categories, categoryFilter])

  const categoryMap = useMemo(() => {
    return new Map(categories.map((category) => [category.id, category]))
  }, [categories])

  const decoratedCards = useMemo(() => {
    return cards.map((card) => ({
      ...card,
      categoryName: categoryMap.get(card.categoryId)?.name || 'Dossier inconnu'
    }))
  }, [cards, categoryMap])

  const filteredCards = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return decoratedCards.filter((card) => {
      if (categoryFilter !== 'all' && card.categoryId !== categoryFilter) {
        return false
      }

      if (!normalizedQuery) {
        return true
      }

      const searchable = `${card.question} ${card.answer} ${card.categoryName}`.toLowerCase()
      return searchable.includes(normalizedQuery)
    })
  }, [decoratedCards, categoryFilter, query])

  const sortedCategories = useMemo(() => {
    return categories.slice().sort((a, b) => a.name.localeCompare(b.name))
  }, [categories])

  const openAddPanel = () => {
    setPanelState({
      isOpen: true,
      mode: 'add',
      type: 'flashcard',
      item: null
    })
    setNotice('')
  }

  const closePanel = () => {
    setPanelState(defaultPanelState)
  }

  const handleEditCard = (card) => {
    const source = cards.find((item) => item.id === card.id) || card
    setPanelState({
      isOpen: true,
      mode: 'edit',
      type: 'flashcard',
      item: source
    })
    setNotice('')
  }

  const handleManageCurrentCategory = () => {
    if (categoryFilter === 'all') {
      return
    }

    const category = categories.find((item) => item.id === categoryFilter)
    if (!category) {
      return
    }

    setPanelState({
      isOpen: true,
      mode: 'edit',
      type: 'folder',
      item: category
    })
    setNotice('')
  }

  const handlePanelSubmit = async (payload) => {
    setNotice('')
    setIsSyncing(true)

    let message = ''
    let nextCategoryId = null

    try {
      if (payload.type === 'flashcard') {
        let categoryId = payload.categoryId || ''

        if (payload.categoryMode === 'new') {
          const newCategory = await createCategory({ name: payload.newCategoryName })
          categoryId = newCategory.id
          nextCategoryId = newCategory.id
          message = payload.mode === 'add'
            ? 'Dossier ajoute et carte enregistree.'
            : 'Dossier ajoute et carte mise a jour.'
        }

        if (payload.mode === 'add') {
          await createCard({
            question: payload.question,
            answer: payload.answer,
            categoryId
          })
          if (!message) {
            message = 'Carte ajoutee.'
          }
        } else {
          await updateCard(payload.id, {
            question: payload.question,
            answer: payload.answer,
            categoryId
          })
          if (!message) {
            message = 'Carte mise a jour.'
          }
        }

        if (!nextCategoryId) {
          nextCategoryId = categoryId
        }
      } else {
        if (payload.mode === 'add') {
          const category = await createCategory({ name: payload.name })
          message = 'Dossier ajoute.'
          nextCategoryId = category.id
        } else {
          await updateCategory(payload.id, { name: payload.name })
          message = 'Dossier mis a jour.'
          nextCategoryId = payload.id
        }
      }

      await fetchAndSetState({ silent: true })
      if (nextCategoryId) {
        setCategoryFilter(nextCategoryId)
      }
      setNoticeTone('success')
      setNotice(message)
      closePanel()
    } finally {
      setIsSyncing(false)
    }
  }

  const handlePanelDelete = async ({ type, id }) => {
    setNotice('')
    setIsSyncing(true)

    let message = ''
    let tone = 'success'

    try {
      if (type === 'flashcard') {
        await deleteCard(id)
        message = 'Carte supprimee.'
        tone = 'success'
      } else {
        await deleteCategory(id)
        message = 'Dossier supprime. Les cartes rattachees ont ete retirees.'
        tone = 'warning'
      }

      await fetchAndSetState({ silent: true })

      if (type === 'folder' && categoryFilter === id) {
        setCategoryFilter('all')
      }

      setNoticeTone(tone)
      setNotice(message)
      closePanel()
    } finally {
      setIsSyncing(false)
    }
  }

  const handleDeleteCard = async (card) => {
    const confirmMessage = 'Confirmer la suppression de cette carte ?'
    if (!window.confirm(confirmMessage)) {
      return
    }

    setNotice('')
    setIsSyncing(true)

    try {
      await deleteCard(card.id)
      await fetchAndSetState({ silent: true })
      setNoticeTone('success')
      setNotice('Carte supprimee.')
    } catch (err) {
      setNoticeTone('error')
      setNotice(err?.message || 'Suppression impossible pour le moment.')
    } finally {
      setIsSyncing(false)
    }
  }

  const handleChangeCategory = (event) => {
    setCategoryFilter(event.target.value)
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="intro">
          <h1>MemoBoost</h1>
          <p>Travaillez vos connaissances avec des cartes memos interactives.</p>
        </div>

        <div className="header-tools">
          <div className="controls">
            <label className="control">
              <span>Rechercher</span>
              <input
                type="search"
                name="search"
                placeholder="Question, reponse ou dossier"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <label className="control">
              <span>Dossier</span>
              <div className="control-row">
                <select name="category" value={categoryFilter} onChange={handleChangeCategory}>
                  <option value="all">Tous les dossiers</option>
                  {sortedCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="control-button"
                  onClick={handleManageCurrentCategory}
                  disabled={categoryFilter === 'all'}
                >
                  Gerer
                </button>
              </div>
            </label>
          </div>

          <button type="button" className="add-button" onClick={openAddPanel}>
            Ajouter
          </button>
        </div>
      </header>

      <main className="app-content">
        {status === 'loading' && <div className="status-message">Chargement des cartes...</div>}
        {status === 'error' && <div className="status-message error">{error}</div>}
        {status === 'ready' && notice && <div className={`status-message ${noticeTone}`}>{notice}</div>}
        {status === 'ready' && isSyncing && (
          <div className="status-message sync">Synchronisation en cours...</div>
        )}
        {status === 'ready' && (
          <FlashcardGrid cards={filteredCards} onEditCard={handleEditCard} onDeleteCard={handleDeleteCard} />
        )}
      </main>

      {panelState.isOpen && (
        <ItemPanel
          isOpen={panelState.isOpen}
          mode={panelState.mode}
          type={panelState.type}
          categories={sortedCategories}
          item={panelState.item}
          onSubmit={handlePanelSubmit}
          onDelete={handlePanelDelete}
          onClose={closePanel}
        />
      )}
    </div>
  )
}

export default App
