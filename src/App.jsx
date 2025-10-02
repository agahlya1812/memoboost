import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import FolderGrid from './components/FolderGrid'
import ItemPanel from './components/ItemPanel'
import FlashcardEnvelope from './components/FlashcardEnvelope'
import RevisionModal from './components/RevisionModal'
import ImportExportModal from './components/ImportExportModal'
import {
  clearAuthUserId,
  createCard,
  createCategory,
  deleteCard,
  deleteCategory,
  fetchState,
  loginUser,
  registerUser,
  setAuthUserId,
  updateCard,
  updateCardStatus,
  updateCategory
} from './services/api'
import { DEFAULT_COLOR, PASTEL_COLORS } from './constants/palette'
import { ensureSlug } from './utils/slug'
import { readStateFromLocal, writeStateToLocal, mergeServerAndLocal, removeStateFromLocal } from './utils/localBackup'
import './App.css'

const defaultPanelState = {
  isOpen: false,
  mode: 'add',
  type: 'folder',
  item: null,
  availableTypes: ['folder'],
  contextCategoryId: null,
  contextLabel: 'Racine',
  contextColor: DEFAULT_COLOR,
  defaultCategoryId: ''
}


const DEFAULT_REVISION_DURATION = 5 * 60

const defaultRevisionSession = {
  isOpen: false,
  cards: [],
  currentIndex: 0,
  endTime: 0,
  remaining: 0,
  revealed: false,
  answered: 0,
  completed: false,
  envelopeName: '',
  envelopeId: ''
}

const STORAGE_USER_KEY = 'memoboost-user'

function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '' })
  const [authError, setAuthError] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [cards, setCards] = useState([])
  const [categories, setCategories] = useState([])
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [noticeTone, setNoticeTone] = useState('info')
  const [query, setQuery] = useState('')
  const [cardFilter, setCardFilter] = useState('all')
  const [isSyncing, setIsSyncing] = useState(false)
  const [currentFolderId, setCurrentFolderId] = useState(null)
  const [revisionSession, setRevisionSession] = useState(defaultRevisionSession)
  const [importExportModal, setImportExportModal] = useState({ isOpen: false })
  const location = useLocation()
  const navigate = useNavigate()
  const [panelState, setPanelState] = useState(defaultPanelState)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('memoboost-user')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && parsed.id) {
          setCurrentUser(parsed)
          setAuthUserId(parsed.id)
        }
      }
    } catch (error) {
      console.warn('Impossible de lire la session locale', error)
    } finally {
      setAuthChecked(true)
    }
  }, [])

  const normalizeCategories = useCallback((items = []) => {
    return items.map((category) => {
      const colorKey = category?.color && PASTEL_COLORS[category.color] ? category.color : DEFAULT_COLOR
      return {
        ...category,
        color: colorKey
      }
    })
  }, [])

  const shuffleArray = useCallback((items) => {
    const copy = items.slice()
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1))
      const temp = copy[index]
      copy[index] = copy[randomIndex]
      copy[randomIndex] = temp
    }
    return copy
  }, [])

  const fetchAndSetState = useCallback(
    async ({ silent = false } = {}) => {
      if (!currentUser) {
        if (!silent) {
          setStatus('idle')
        }
        setCards([])
        setCategories([])
        return { cards: [], categories: [] }
      }

      if (!silent) {
        setStatus('loading')
      }

      try {
        const data = await fetchState()
        // Fusionner avec le local si le serveur renvoie vide
        const local = readStateFromLocal(currentUser.id)
        const merged = mergeServerAndLocal(data, local)
        setCards(merged.cards || [])
        setCategories(normalizeCategories(merged.categories || []))
        if (data.user && currentUser && currentUser.id === data.user.id) {
          if (currentUser.email !== data.user.email || currentUser.name !== data.user.name) {
            setCurrentUser((prev) => ({ ...prev, ...data.user }))
          }
        }
        setError('')
        setStatus('ready')
        // Sauvegarde locale après succès
        writeStateToLocal(currentUser.id, { cards: merged.cards || [], categories: merged.categories || [] })
        return data
      } catch (err) {
        // Tentative de lecture locale en secours
        const local = readStateFromLocal(currentUser.id)
        if (local) {
          setCards(local.cards || [])
          setCategories(normalizeCategories(local.categories || []))
          setError('')
          setStatus('ready')
          return { ...local, user: currentUser }
        }
        const message = err.message || 'Impossible de charger les donnees.'
        setError(message)
        setStatus('error')
        throw err
      }
    },
    [currentUser, normalizeCategories]
  )

  useEffect(() => {
    if (currentFolderId && !categories.some((category) => category.id === currentFolderId)) {
      setCurrentFolderId(null)
      navigate('/', { replace: true })
    }
  }, [categories, currentFolderId, navigate])

  const categoryMap = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories])

  const slugMappings = useMemo(() => {
    const slugToId = new Map()
    const idToSlug = new Map()

    const buildSlugForCategory = (category) => {
      const segments = []
      const visited = new Set()
      let current = category

      while (current && !visited.has(current.id)) {
        visited.add(current.id)
        const segment = ensureSlug(current.name, current.id)
        segments.unshift(segment)
        current = current.parentId ? categoryMap.get(current.parentId) : null
      }

      return segments.join('/')
    }

    categories.forEach((category) => {
      let baseSlug = buildSlugForCategory(category)
      if (!baseSlug) {
        baseSlug = ensureSlug(category.id, `dossier-${category.id.slice(-6)}`)
      }

      let slug = baseSlug
      let suffix = 2

      while (slug && slugToId.has(slug) && slugToId.get(slug) !== category.id) {
        slug = `${baseSlug}-${suffix}`
        suffix += 1
      }

      if (!slug) {
        slug = ensureSlug(category.id, `dossier-${category.id.slice(-6)}`)
      }

      slugToId.set(slug, category.id)
      idToSlug.set(category.id, slug)
    })

    return { slugToId, idToSlug }
  }, [categories, categoryMap])

  const normalizePath = useCallback((pathValue) => {
    if (!pathValue) {
      return '/'
    }

    const decoded = decodeURIComponent(pathValue)
    const trimmed = decoded.replace(/^\/+|\+$/g, '')
    return trimmed ? `/${trimmed}` : '/'
  }, [])

  const goToFolder = useCallback(
    (folderId, { replace = false } = {}) => {
      const slug = folderId ? slugMappings.idToSlug.get(folderId) : ''
      const targetPath = slug ? `/${slug}` : '/'
      const normalizedTarget = normalizePath(targetPath)
      const normalizedCurrent = normalizePath(location.pathname)

      if (normalizedTarget !== normalizedCurrent) {
        navigate(normalizedTarget, { replace })
      }

      const normalizedId = folderId ?? null
      if (normalizedId !== currentFolderId) {
        setCurrentFolderId(normalizedId)
      }
    },
    [slugMappings, location.pathname, navigate, normalizePath, currentFolderId]
  )

  useEffect(() => {
    if (status !== 'ready') {
      return
    }

    const normalizedPath = normalizePath(location.pathname)
    if (normalizedPath === '/') {
      if (currentFolderId !== null) {
        setCurrentFolderId(null)
      }
      return
    }

    const key = normalizedPath.slice(1)
    const targetId = slugMappings.slugToId.get(key)

    if (targetId) {
      if (targetId !== currentFolderId) {
        setCurrentFolderId(targetId)
      }
    } else if (slugMappings.slugToId.size) {
      navigate('/', { replace: true })
    }
  }, [currentFolderId, location.pathname, navigate, normalizePath, slugMappings, status])

  useEffect(() => {
    if (status !== 'ready') {
      return
    }

    if (currentFolderId) {
      goToFolder(currentFolderId, { replace: true })
    }
  }, [currentFolderId, goToFolder, status])

  const decoratedCards = useMemo(
    () =>
      cards.map((card) => {
        const folder = categoryMap.get(card.categoryId)
        const colorKey = folder?.color || DEFAULT_COLOR
        return {
          ...card,
          categoryName: folder?.name || 'Dossier',
          categoryColor: colorKey
        }
      }),
    [cards, categoryMap]
  )

  const selectedCategory = currentFolderId ? categoryMap.get(currentFolderId) : null

  const listingParentId = selectedCategory && selectedCategory.parentId !== null
    ? selectedCategory.parentId
    : currentFolderId ?? null

  const listingFolders = useMemo(() => {
    const hasActiveEnvelope = Boolean(selectedCategory && selectedCategory.parentId !== null)
    const normalized = hasActiveEnvelope ? '' : query.trim().toLowerCase()
    return categories
      .filter((category) => (category.parentId ?? null) === listingParentId)
      .filter((category) => {
        if (!normalized) {
          return true
        }
        return category.name.toLowerCase().includes(normalized)
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [categories, listingParentId, query, selectedCategory])

  const listingParentCategory = listingParentId ? categoryMap.get(listingParentId) : null
  const isRootLevel = listingParentId === null
  const isEnvelopeView = Boolean(selectedCategory && selectedCategory.parentId !== null)
  const activeEnvelope = isEnvelopeView ? selectedCategory : null
  const activeEnvelopeId = activeEnvelope ? activeEnvelope.id : null
  const isAuthenticated = Boolean(currentUser)

  useEffect(() => {
    setCardFilter('all')
  }, [activeEnvelopeId])

  const envelopeCards = useMemo(() => {
    if (!activeEnvelopeId) {
      return []
    }
    return decoratedCards.filter((card) => card.categoryId === activeEnvelopeId)
  }, [decoratedCards, activeEnvelopeId])

  const filteredCards = useMemo(() => {
    if (!activeEnvelope) {
      return []
    }

    const normalizedQuery = query.trim().toLowerCase()

    return envelopeCards.filter((card) => {
      const status = card.masteryStatus || 'unknown'
      const matchesFilter = cardFilter === 'all' ? true : status === cardFilter

      if (!matchesFilter) {
        return false
      }

      if (!normalizedQuery) {
        return true
      }

      const searchable = `${card.question} ${card.answer} ${card.categoryName}`.toLowerCase()
      return searchable.includes(normalizedQuery)
    })
  }, [activeEnvelope, envelopeCards, query, cardFilter])

  const folderTrail = useMemo(() => {
    if (!selectedCategory) {
      return []
    }

    const trail = []
    const visited = new Set()
    let pointer = selectedCategory

    while (pointer && !visited.has(pointer.id)) {
      visited.add(pointer.id)
      trail.unshift(pointer)
      pointer = pointer.parentId ? categoryMap.get(pointer.parentId) : null
    }

    return trail
  }, [categoryMap, selectedCategory])

  const folderGridVariant = isRootLevel ? 'folder' : 'envelope'
  const folderGridEmptyMessage = isRootLevel ? 'Aucun dossier a afficher ici.' : 'Aucune enveloppe dans ce dossier.'

  const floatingActionLabel = !selectedCategory
    ? 'Ajouter un dossier'
    : isEnvelopeView
      ? 'Ajouter une carte'
      : 'Ajouter une enveloppe'

  const resetNotice = () => {
    setNotice('')
    setNoticeTone('info')
  }

  const closePanel = () => {
    setPanelState(defaultPanelState)
  }

  const openAddFolder = () => {
    resetNotice()
    const baseColor = listingParentCategory?.color || DEFAULT_COLOR
    setPanelState({
      ...defaultPanelState,
      isOpen: true,
      mode: 'add',
      type: 'folder',
      availableTypes: ['folder'],
      contextCategoryId: listingParentId,
      contextLabel: listingParentCategory ? listingParentCategory.name : 'Racine',
      contextColor: baseColor
    })
  }

  const openAddCard = (envelope = activeEnvelope) => {
    if (!envelope) {
      return
    }

    resetNotice()
    const baseColor = envelope.color || DEFAULT_COLOR
    setPanelState({
      ...defaultPanelState,
      isOpen: true,
      mode: 'add',
      type: 'flashcard',
      item: null,
      availableTypes: ['flashcard'],
      contextCategoryId: envelope.id,
      contextLabel: envelope.name,
      contextColor: baseColor,
      defaultCategoryId: envelope.id
    })
  }

  const openFolder = (folderId) => {
    resetNotice()
    goToFolder(folderId)
  }

  const handleEditCard = (card) => {
    const source = cards.find((item) => item.id === card.id) || card
    const folder = categoryMap.get(source.categoryId)
    const baseColor = folder?.color || DEFAULT_COLOR
    resetNotice()
    setPanelState({
      ...defaultPanelState,
      isOpen: true,
      mode: 'edit',
      type: 'flashcard',
      item: source,
      availableTypes: ['flashcard'],
      contextCategoryId: source.categoryId,
      contextLabel: folder?.name || '',
      contextColor: baseColor,
      defaultCategoryId: source.categoryId
    })
  }

  const handleEditFolder = (folder) => {
    resetNotice()
    const parent = folder.parentId ? categoryMap.get(folder.parentId) : null
    const parentColor = parent?.color || DEFAULT_COLOR
    setPanelState({
      ...defaultPanelState,
      isOpen: true,
      mode: 'edit',
      type: 'folder',
      item: folder,
      availableTypes: ['folder'],
      contextCategoryId: folder.parentId ?? null,
      contextLabel: parent ? parent.name : 'Racine',
      contextColor: parentColor
    })
  }

  const handlePanelSubmit = async (payload) => {
    setIsSyncing(true)

    let message = ''
    let nextFolderId = currentFolderId

    try {
      if (payload.type === 'flashcard') {
        let categoryId =
          payload.categoryId || payload.selectedCategoryId || panelState.contextCategoryId || currentFolderId || ''

        if (payload.categoryMode === 'new') {
          const newCategory = await createCategory({
            name: payload.newCategoryName,
            parentId: panelState.contextCategoryId ?? null,
            color: panelState.contextColor || DEFAULT_COLOR
          })
          categoryId = newCategory.id
          message = payload.mode === 'add'
            ? 'Dossier cree et carte enregistree.'
            : 'Dossier cree et carte mise a jour.'
        }

        if (payload.mode === 'add') {
          await createCard({
            question: payload.question,
            answer: payload.answer,
            categoryId
          })
          message = message || 'Carte ajoutee.'
        } else {
          await updateCard(payload.id, {
            question: payload.question,
            answer: payload.answer,
            categoryId
          })
          message = message || 'Carte mise a jour.'
        }

        nextFolderId = categoryId
      } else {
        const parentId = panelState.contextCategoryId ?? null
        const colorToUse = payload.color || panelState.contextColor || DEFAULT_COLOR

        if (payload.mode === 'add') {
          await createCategory({ name: payload.name, parentId, color: colorToUse })
          message = 'Dossier ajoute.'
          nextFolderId = parentId
        } else {
          await updateCategory(payload.id, { name: payload.name, parentId, color: colorToUse })
          message = 'Dossier mis a jour.'
          if (currentFolderId === payload.id) {
            goToFolder(payload.id, { replace: true })
          }
        }
      }

      await fetchAndSetState({ silent: true })
      // Après mutations réussies, mettre à jour la sauvegarde locale
      try {
        writeStateToLocal(currentUser.id, { cards, categories })
      } catch (_) {}

      if (payload.type === 'flashcard') {
        goToFolder(nextFolderId || null)
      }

      setNoticeTone('success')
      setNotice(message)
      closePanel()
    } catch (error) {
      if (error?.status === 401) {
        handleSessionExpired()
      } else {
        setNoticeTone('error')
        setNotice(error?.message || 'Action impossible pour le moment.')
      }
      throw error
    } finally {
      setIsSyncing(false)
    }
  }

  const handlePanelDelete = async ({ type, id }) => {
    setIsSyncing(true)
    resetNotice()

    const folder = type === 'folder' ? categoryMap.get(id) : null
    const folderParentId = folder ? folder.parentId ?? null : null

    try {
      if (type === 'flashcard') {
        await deleteCard(id)
        setNoticeTone('success')
        setNotice('Carte supprimee.')
      } else {
        await deleteCategory(id)
        setNoticeTone('warning')
        setNotice('Dossier supprime ainsi que les elements rattaches.')
        if (currentFolderId === id) {
          goToFolder(folderParentId ?? null, { replace: true })
        }
      }

      await fetchAndSetState({ silent: true })
      closePanel()
    } catch (error) {
      if (error?.status === 401) {
        handleSessionExpired()
      } else {
        setNoticeTone('error')
        setNotice(error?.message || 'Suppression impossible pour le moment.')
      }
      throw error
    } finally {
      setIsSyncing(false)
    }
  }

  const handleDeleteFolder = async (folder) => {
    const confirmMessage = 'Supprimer ce dossier et tout son contenu ?'
    if (!window.confirm(confirmMessage)) {
      return
    }

    try {
      await handlePanelDelete({ type: 'folder', id: folder.id })
    } catch (error) {
      // erreur deja notifiee
    }
  }

  const handleEvaluateCard = async (targetCard, masteryStatus, { silent = false } = {}) => {
    if (!targetCard || !['known', 'review', 'unknown'].includes(masteryStatus)) {
      return false
    }

    const previousStatus = targetCard.masteryStatus || 'unknown'

    setCards((prev) =>
      prev.map((item) => (item.id === targetCard.id ? { ...item, masteryStatus } : item))
    )

    try {
      await updateCardStatus(targetCard.id, masteryStatus, {
        question: targetCard.question,
        answer: targetCard.answer,
        categoryId: targetCard.categoryId
      })
      try {
        const nextCards = (cards || []).map((item) => (item.id === targetCard.id ? { ...item, masteryStatus } : item))
        writeStateToLocal(currentUser?.id, { cards: nextCards, categories })
      } catch (_) {}
      if (!silent) {
        setNoticeTone('success')
        setNotice(masteryStatus === 'known' ? 'Carte marquée comme maîtrisée.' : 'Carte à revoir.')
      }
      return true
    } catch (error) {
      setCards((prev) =>
        prev.map((item) => (item.id === targetCard.id ? { ...item, masteryStatus: previousStatus } : item))
      )
      if (error?.status === 401) {
        handleSessionExpired()
      } else {
        setNoticeTone('error')
        setNotice(error?.message || 'Impossible de mettre à jour le statut.')
      }
      return false
    }
  }

  const handleCardFilterChange = useCallback((value) => {
    if (!['all', 'review', 'known'].includes(value)) {
      return
    }
    setCardFilter(value)
  }, [])

  const handleAuthInputChange = (field, value) => {
    setAuthForm((current) => ({
      ...current,
      [field]: value
    }))
  }

  const handleAuthSubmit = async (event) => {
    event.preventDefault()
    if (authBusy) {
      return
    }

    const mode = authMode
    const email = authForm.email.trim().toLowerCase()
    const password = authForm.password

    if (!email || !password) {
      setAuthError('Email et mot de passe requis.')
      return
    }

    if (mode === 'register' && password.length < 6) {
      setAuthError('Le mot de passe doit contenir au moins 6 caracteres.')
      return
    }

    setAuthBusy(true)
    setAuthError('')

    try {
      const payload = { email, password }
      if (mode === 'register') {
        payload.name = authForm.name.trim()
      }

      const user = mode === 'register' ? await registerUser(payload) : await loginUser(payload)

      setAuthUserId(user.id)
      window.localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user))
      setCurrentUser(user)
      setStatus('loading')
      setError('')
      setNoticeTone('success')
      setNotice(mode === 'register' ? 'Compte créé. Vos données sont synchronisées.' : 'Connexion réussie.')
      setAuthMode('login')
      setAuthForm({ email: user.email || email, password: '', name: user.name || '' })
    } catch (error) {
      setAuthError(error?.message || (mode === 'register' ? "Inscription impossible pour le moment." : 'Connexion impossible pour le moment.'))
    } finally {
      setAuthBusy(false)
    }
  }

  const toggleAuthMode = () => {
    setAuthMode((current) => (current === 'login' ? 'register' : 'login'))
    setAuthError('')
    setAuthForm((current) => ({ ...current, password: '' }))
  }

  const startRevisionSession = () => {
    if (!activeEnvelope) {
      setNoticeTone('warning')
      setNotice('Ouvrez une enveloppe pour lancer une révision.')
      return
    }

    const sourceCards = envelopeCards

    if (!sourceCards.length) {
      setNoticeTone('warning')
      setNotice('Aucune carte disponible dans cette enveloppe.')
      return
    }

    const duration = DEFAULT_REVISION_DURATION
    const endTime = Date.now() + duration * 1000

    setRevisionSession({
      isOpen: true,
      cards: shuffleArray(sourceCards),
      currentIndex: 0,
      endTime,
      remaining: duration,
      revealed: false,
      answered: 0,
      completed: false,
      envelopeName: activeEnvelope.name,
      envelopeId: activeEnvelope.id
    })
  }

  const stopRevisionSession = useCallback(() => {
    setRevisionSession(defaultRevisionSession)
  }, [])

  const handleLogout = useCallback(() => {
    const previousEmail = currentUser?.email || authForm.email || ''
    const previousUserId = currentUser?.id || null
    clearAuthUserId()
    window.localStorage.removeItem(STORAGE_USER_KEY)
    if (previousUserId) {
      removeStateFromLocal(previousUserId)
    }
    stopRevisionSession()
    setCurrentUser(null)
    setPanelState(defaultPanelState)
    setCurrentFolderId(null)
    setCardFilter('all')
    setCards([])
    setCategories([])
    setStatus('idle')
    setError('')
    setNotice('')
    setQuery('')
    setAuthMode('login')
    setAuthForm({ email: previousEmail, password: '', name: '' })
    setAuthError('')
    setAuthBusy(false)
  }, [authForm.email, currentUser, stopRevisionSession])

  const handleSessionExpired = useCallback(() => {
    handleLogout()
    setNoticeTone('warning')
    setNotice('Session expirée. Veuillez vous reconnecter.')
  }, [handleLogout])

  useEffect(() => {
    if (!currentUser) {
      return
    }

    fetchAndSetState().catch((error) => {
      if (error?.status === 401) {
        handleSessionExpired()
      }
    })
  }, [currentUser, fetchAndSetState, handleSessionExpired])

  const handleRevisionReveal = () => {
    setRevisionSession((prev) => {
      if (!prev.isOpen || prev.completed) {
        return prev
      }
      return { ...prev, revealed: true }
    })
  }

  const handleRevisionEvaluate = async (masteryStatus) => {
    if (!revisionSession.isOpen || revisionSession.completed) {
      return
    }

    const currentCard = revisionSession.cards[revisionSession.currentIndex]
    if (!currentCard) {
      return
    }

    const success = await handleEvaluateCard(currentCard, masteryStatus, { silent: true })
    if (!success) {
      return
    }

    setRevisionSession((prev) => {
      if (!prev.isOpen) {
        return prev
      }
      const updatedCards = prev.cards.map((item, index) => (index === prev.currentIndex ? { ...item, masteryStatus } : item))
      const answered = prev.answered + 1
      if (prev.currentIndex + 1 >= prev.cards.length) {
        return {
          ...prev,
          cards: updatedCards,
          answered,
          completed: true,
          revealed: false
        }
      }
      return {
        ...prev,
        cards: updatedCards,
        answered,
        currentIndex: prev.currentIndex + 1,
        revealed: false
      }
    })
  }

  const handleDeleteCard = async (card) => {
    const confirmMessage = 'Confirmer la suppression de cette carte ?'
    if (!window.confirm(confirmMessage)) {
      return
    }

    setIsSyncing(true)
    resetNotice()

    try {
      await deleteCard(card.id)
      await fetchAndSetState({ silent: true })
      setNoticeTone('success')
      setNotice('Carte supprimee.')
    } catch (error) {
      if (error?.status === 401) {
        handleSessionExpired()
      } else {
        setNoticeTone('error')
        setNotice(error?.message || 'Suppression impossible pour le moment.')
      }
    } finally {
      setIsSyncing(false)
    }
  }

  const openImportExportModal = useCallback(() => {
    setImportExportModal({ isOpen: true })
  }, [])

  const closeImportExportModal = useCallback(() => {
    setImportExportModal({ isOpen: false })
  }, [])

  const handleImportData = useCallback(async (importedData) => {
    setIsSyncing(true)
    setNotice('')
    
    try {
      // Créer les catégories d'abord
      const categoryMap = new Map()
      
      for (const categoryData of importedData.categories) {
        const newCategory = await createCategory({
          name: categoryData.name,
          parentId: categoryData.parentId,
          color: categoryData.color || 'blue'
        })
        categoryMap.set(categoryData.name, newCategory.id)
      }
      
      // Créer les cartes
      for (const cardData of importedData.cards) {
        const categoryId = cardData.categoryName 
          ? categoryMap.get(cardData.categoryName) 
          : cardData.categoryId || currentFolderId
        
        if (categoryId) {
          await createCard({
            question: cardData.question,
            answer: cardData.answer,
            categoryId
          })
        }
      }
      
      await fetchAndSetState({ silent: true })
      setNoticeTone('success')
      setNotice(`Import réussi ! ${importedData.cards.length} cartes et ${importedData.categories.length} dossiers importés.`)
    } catch (error) {
      setNoticeTone('error')
      setNotice(`Erreur lors de l'import : ${error.message}`)
    } finally {
      setIsSyncing(false)
      closeImportExportModal()
    }
  }, [createCategory, createCard, fetchAndSetState, currentFolderId, closeImportExportModal])

  const handleCloseEnvelope = useCallback(() => {
    if (!activeEnvelope) {
      return
    }
    stopRevisionSession()
    goToFolder(activeEnvelope.parentId ?? null, { replace: true })
  }, [activeEnvelope, goToFolder, stopRevisionSession])

  useEffect(() => {
    if (!activeEnvelope) {
      return
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        handleCloseEnvelope()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [activeEnvelope, handleCloseEnvelope])

  useEffect(() => {
    if (!activeEnvelope && revisionSession.isOpen) {
      stopRevisionSession()
    }
  }, [activeEnvelope, revisionSession.isOpen, stopRevisionSession])

  const handleFloatingAction = () => {
    if (!isAuthenticated) {
      return
    }

    if (!currentFolderId) {
      openAddFolder()
      return
    }

    if (!isEnvelopeView) {
      openAddFolder()
      return
    }

    openAddCard()
  }

  return (
    <div className="app">
      <header className="app-topbar">
        <div className="app-brand">
          <img src={`${import.meta.env.BASE_URL}logo.png?v=${Date.now()}`} alt="MemoBoost" className="app-logo" />
        </div>
        <div className="app-topbar-right">
          <div className="app-search">
            <input
              type="search"
              name="search"
              placeholder="Recherche"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              disabled={!isAuthenticated}
            />
            <button type="button" aria-label="Rechercher" disabled={!isAuthenticated}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <line x1="20" y1="20" x2="16.65" y2="16.65" />
              </svg>
            </button>
          </div>
          {isAuthenticated && currentUser && (
            <div className="app-user">
              <button 
                type="button" 
                className="app-import-export" 
                onClick={openImportExportModal}
                title="Import/Export des données"
              >
                <img src={`${import.meta.env.BASE_URL}icon-json.png`} alt="Import/Export" className="app-import-export-icon" />
              </button>
              <span className="app-user-email">{currentUser.email}</span>
              <button type="button" className="app-user-logout" onClick={handleLogout}>
                Déconnexion
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="app-content">
        {status === 'loading' && <div className="status-message">Chargement...</div>}
        {status === 'error' && <div className="status-message error">{error}</div>}
        {status === 'ready' && notice && <div className={`status-message ${noticeTone}`}>{notice}</div>}
        {status === 'ready' && isSyncing && <div className="status-message sync">Synchronisation en cours...</div>}

        {status === 'ready' && (
          <>
            <nav className="app-breadcrumb" aria-label="Fil d'ariane">
              <button
                type="button"
                className="breadcrumb-link"
                onClick={() => goToFolder(null, { replace: true })}
                aria-current={isRootLevel ? 'page' : undefined}
                disabled={isRootLevel}
              >
                Bibliothèque
              </button>
              {folderTrail.map((folder, index) => {
                const isLast = index === folderTrail.length - 1
                return (
                  <span key={folder.id} className="breadcrumb-item">
                    <span className="breadcrumb-separator">/</span>
                    <button
                      type="button"
                      className="breadcrumb-link"
                      onClick={() => {
                        if (!isLast) {
                          goToFolder(folder.id, { replace: true })
                        }
                      }}
                      disabled={isLast}
                      aria-current={isLast ? 'page' : undefined}
                    >
                      {folder.name}
                    </button>
                  </span>
                )
              })}
            </nav>

            <section className="content-section">
              <header className="content-section-header">
                <h2>{isRootLevel ? 'Dossiers' : `Enveloppes du dossier ${listingParentCategory?.name || ''}`}</h2>
              </header>
              <FolderGrid
                folders={listingFolders}
                onOpen={openFolder}
                onEdit={handleEditFolder}
                onDelete={handleDeleteFolder}
                emptyMessage={folderGridEmptyMessage}
                variant={folderGridVariant}
              />
              {!isEnvelopeView && listingFolders.length > 0 && !isRootLevel && listingParentCategory && (
                <p className="envelope-hint">Sélectionnez une enveloppe pour afficher ses cartes.</p>
              )}
            </section>

            {activeEnvelope && (
              <div
                className="envelope-overlay"
                role="dialog"
                aria-modal="true"
                aria-label={`Enveloppe ${activeEnvelope.name}`}
              >
                <div className="envelope-overlay-backdrop" onClick={handleCloseEnvelope} />
                <div className="envelope-overlay-panel">
                  <FlashcardEnvelope
                    folder={activeEnvelope}
                    cards={filteredCards}
                    filter={cardFilter}
                    onChangeFilter={handleCardFilterChange}
                    onEditCard={handleEditCard}
                    onDeleteCard={handleDeleteCard}
                    onAddCard={openAddCard}
                    onEvaluateCard={handleEvaluateCard}
                    onStartRevision={startRevisionSession}
                    onClose={handleCloseEnvelope}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <button
        type="button"
        className="floating-add"
        onClick={handleFloatingAction}
        aria-label={floatingActionLabel}
        title={floatingActionLabel}
        disabled={!isAuthenticated}
      >
        +
      </button>

      {panelState.isOpen && (
        <ItemPanel
          isOpen={panelState.isOpen}
          mode={panelState.mode}
          type={panelState.type}
          categories={categories}
          item={panelState.item}
          availableTypes={panelState.availableTypes}
          contextCategoryId={panelState.contextCategoryId}
          contextLabel={panelState.contextLabel}
          defaultCategoryId={panelState.defaultCategoryId}
          contextColor={panelState.contextColor}
          onSubmit={handlePanelSubmit}
          onDelete={handlePanelDelete}
          onClose={closePanel}
        />
      )}

      {panelState.isOpen && <div className="app-panel-backdrop" />}

      {revisionSession.isOpen && (
        <RevisionModal
          session={revisionSession}
          onClose={stopRevisionSession}
          onReveal={handleRevisionReveal}
          onEvaluate={handleRevisionEvaluate}
        />
      )}

      {!isAuthenticated && authChecked && (
        <div className="auth-overlay" role="dialog" aria-modal="true" aria-label="Authentification MemoBoost">
          <div className="auth-panel">
            <h2>{authMode === 'login' ? 'Connexion' : 'Créer un compte'}</h2>
            <p>Synchronisez vos enveloppes sur tous vos appareils.</p>
            <form className="auth-form" onSubmit={handleAuthSubmit}>
              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  value={authForm.email}
                  onChange={(event) => handleAuthInputChange('email', event.target.value)}
                  autoComplete="email"
                  required
                  disabled={authBusy}
                />
              </label>

              {authMode === 'register' && (
                <label className="field">
                  <span>Nom (optionnel)</span>
                  <input
                    type="text"
                    value={authForm.name}
                    onChange={(event) => handleAuthInputChange('name', event.target.value)}
                    autoComplete="name"
                    disabled={authBusy}
                  />
                </label>
              )}

              <label className="field">
                <span>Mot de passe</span>
                <input
                  type="password"
                  value={authForm.password}
                  onChange={(event) => handleAuthInputChange('password', event.target.value)}
                  autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                  required
                  disabled={authBusy}
                  minLength={6}
                />
              </label>

              {authError && <p className="auth-error">{authError}</p>}

              <button type="submit" className="auth-submit" disabled={authBusy}>
                {authMode === 'login' ? 'Se connecter' : 'Créer un compte'}
              </button>
            </form>
            <p className="auth-switch">
              {authMode === 'login' ? 'Pas encore de compte ?' : 'Déjà inscrit ?'}{' '}
              <button type="button" onClick={toggleAuthMode} disabled={authBusy}>
                {authMode === 'login' ? 'Créer un compte' : 'Se connecter'}
              </button>
            </p>
          </div>
        </div>
      )}

      {importExportModal.isOpen && (
        <ImportExportModal
          isOpen={importExportModal.isOpen}
          onClose={closeImportExportModal}
          onImport={handleImportData}
          cards={cards}
          categories={categories}
        />
      )}
    </div>
  )
}

export default App
