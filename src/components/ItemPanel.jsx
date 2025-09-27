import { useEffect, useMemo, useState } from 'react'
import { COLOR_OPTIONS, DEFAULT_COLOR, PASTEL_COLORS } from '../constants/palette'

const typeLabels = {
  flashcard: 'Flashcard',
  folder: 'Dossier'
}

const getContextualLabels = (type, contextLabel) => {
  // Si nous sommes dans un dossier (enveloppes), adapter les labels
  if (contextLabel && contextLabel !== 'Racine') {
    return {
      folder: 'Enveloppe',
      flashcard: 'Flashcard'
    }
  }
  return typeLabels
}

const defaultState = {
  question: '',
  answer: '',
  categoryMode: 'existing',
  selectedCategoryId: '',
  newCategoryName: '',
  folderName: '',
  folderColor: DEFAULT_COLOR
}

function ItemPanel({
  isOpen,
  mode,
  type: initialType,
  categories,
  item,
  availableTypes = ['flashcard', 'folder'],
  contextCategoryId = null,
  contextLabel = 'Racine',
  defaultCategoryId = '',
  contextColor = DEFAULT_COLOR,
  onSubmit,
  onDelete,
  onClose
}) {
  const allowedTypes = availableTypes.length ? availableTypes : ['folder']
  const safeInitialType = allowedTypes.includes(initialType) ? initialType : allowedTypes[0]

  const [type, setType] = useState(safeInitialType)
  const [formState, setFormState] = useState(defaultState)
  const [error, setError] = useState('')
  const [isBusy, setIsBusy] = useState(false)

  const shouldForceContextCategory =
    type === 'flashcard' && mode === 'add' && Boolean(contextCategoryId)
  const allowCategorySelection =
    type === 'flashcard' && mode === 'add' && !shouldForceContextCategory

  const sortedCategories = useMemo(
    () => categories.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [categories]
  )

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const nextType = allowedTypes.includes(initialType) ? initialType : allowedTypes[0]
    setType(nextType)
    setError('')
    setIsBusy(false)

    if (mode === 'edit' && item) {
      if (nextType === 'flashcard') {
        setFormState({
          question: item.question || '',
          answer: item.answer || '',
          categoryMode: 'existing',
          selectedCategoryId: item.categoryId || '',
          newCategoryName: '',
          folderName: '',
          folderColor: DEFAULT_COLOR
        })
      } else {
        setFormState({
          ...defaultState,
          folderName: item.name || '',
          folderColor: item.color || DEFAULT_COLOR
        })
      }
    } else {
      if (nextType === 'flashcard') {
        const preferred = defaultCategoryId || contextCategoryId || sortedCategories[0]?.id || ''
        setFormState({
          question: '',
          answer: '',
          categoryMode: preferred ? 'existing' : 'new',
          selectedCategoryId: preferred,
          newCategoryName: '',
          folderName: '',
          folderColor: DEFAULT_COLOR
        })
      } else {
        setFormState({
          ...defaultState,
          folderColor: contextColor
        })
      }
    }
  }, [allowedTypes, contextCategoryId, contextColor, defaultCategoryId, initialType, isOpen, item, mode, sortedCategories])

  const updateForm = (changes) => {
    setFormState((current) => ({
      ...current,
      ...changes
    }))
  }

  const handleClose = () => {
    if (isBusy) {
      return
    }
    onClose()
  }

  const validateFlashcard = () => {
    const question = formState.question.trim()
    const answer = formState.answer.trim()

    if (!question || !answer) {
      setError('Merci de remplir la question et la reponse.')
      return null
    }

    if (mode === 'edit') {
      const categoryId = item?.categoryId || contextCategoryId || formState.selectedCategoryId
      if (!categoryId) {
        setError('Dossier introuvable pour cette carte.')
        return null
      }
      return {
        question,
        answer,
        categoryMode: 'existing',
        categoryId
      }
    }

    if (shouldForceContextCategory) {
      return {
        question,
        answer,
        categoryMode: 'existing',
        categoryId: contextCategoryId
      }
    }

    if (formState.categoryMode === 'new') {
      const newName = formState.newCategoryName.trim()
      if (!newName) {
        setError('Indiquez le nom du nouveau dossier.')
        return null
      }
      return {
        question,
        answer,
        categoryMode: 'new',
        newCategoryName: newName
      }
    }

    const categoryId = formState.selectedCategoryId

    if (!categoryId) {
      setError('Choisissez un dossier existant.')
      return null
    }

    return {
      question,
      answer,
      categoryMode: 'existing',
      categoryId
    }
  }

  const validateFolder = () => {
    const folderName = formState.folderName.trim()
    if (!folderName) {
      setError('Le nom du dossier est obligatoire.')
      return null
    }

    return { name: folderName, color: formState.folderColor }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!onSubmit) {
      return
    }

    setError('')

    let payload = null

    if (type === 'flashcard') {
      payload = validateFlashcard()
    } else {
      payload = validateFolder()
    }

    if (!payload) {
      return
    }

    const submission = {
      mode,
      type,
      id: item?.id,
      ...payload
    }

    try {
      setIsBusy(true)
      await onSubmit(submission)
    } catch (err) {
      setError(err.message || 'Action impossible pour le moment.')
      setIsBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete || !item) {
      return
    }

    const message =
      type === 'flashcard'
        ? 'Confirmer la suppression de cette carte ?'
        : 'Supprimer ce dossier et tous ses contenus ?'

    if (!window.confirm(message)) {
      return
    }

    try {
      setError('')
      setIsBusy(true)
      await onDelete({ type, id: item.id })
    } catch (err) {
      setError(err.message || 'Suppression impossible pour le moment.')
      setIsBusy(false)
    }
  }

  const contextualLabels = getContextualLabels(type, contextLabel)
  const typeEntries = Object.entries(contextualLabels).filter(([value]) => allowedTypes.includes(value))

  return (
    <div className="add-panel-overlay" role="dialog" aria-modal="true">
      <div className="add-panel">
        <header className="add-panel-header">
          <h2>
            {mode === 'add' ? 'Ajouter' : 'Modifier'} une {contextualLabels[type]}
          </h2>
          <button type="button" className="icon-button" onClick={handleClose} aria-label="Fermer">
            x
          </button>
        </header>

        <form className="add-panel-body" onSubmit={handleSubmit}>
          {typeEntries.length > 1 && (
            <div className="toggle-group" role="radiogroup" aria-label="Type de contenu">
              {typeEntries.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`toggle-button ${type === value ? 'is-active' : ''}`}
                  onClick={() => {
                    if (isBusy || type === value) {
                      return
                    }
                    setType(value)
                    setError('')
                    if (mode !== 'edit') {
                      if (value === 'flashcard') {
                        const preferred = defaultCategoryId || contextCategoryId || sortedCategories[0]?.id || ''
                        setFormState({
                          question: '',
                          answer: '',
                          categoryMode: preferred ? 'existing' : 'new',
                          selectedCategoryId: preferred,
                          newCategoryName: '',
                          folderName: '',
                          folderColor: DEFAULT_COLOR
                        })
                      } else {
                        setFormState({
                          ...defaultState,
                          folderColor: contextColor
                        })
                      }
                    }
                  }}
                  role="radio"
                  aria-checked={type === value}
                  disabled={isBusy}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {type === 'flashcard' ? (
            <>
              <label className="field">
                <span>Question</span>
                <textarea
                  rows="3"
                  value={formState.question}
                  onChange={(event) => updateForm({ question: event.target.value })}
                  placeholder="Formulez votre question"
                  required
                  disabled={isBusy}
                />
              </label>

              <label className="field">
                <span>Reponse</span>
                <textarea
                  rows="3"
                  value={formState.answer}
                  onChange={(event) => updateForm({ answer: event.target.value })}
                  placeholder="Entrez la reponse"
                  required
                  disabled={isBusy}
                />
              </label>

              {allowCategorySelection ? (
                <fieldset className="field">
                  <legend>Dossier</legend>
                  <p className="panel-hint">Contexte : {contextLabel}</p>
                  <div className="category-switch">
                    <label>
                      <input
                        type="radio"
                        name="category-mode"
                        value="existing"
                        checked={formState.categoryMode === 'existing'}
                        onChange={() => updateForm({ categoryMode: 'existing' })}
                        disabled={isBusy}
                      />
                      <span>Existant</span>
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="category-mode"
                        value="new"
                        checked={formState.categoryMode === 'new'}
                        onChange={() => updateForm({ categoryMode: 'new' })}
                        disabled={isBusy}
                      />
                      <span>Nouveau</span>
                    </label>
                  </div>

                  {formState.categoryMode === 'existing' ? (
                    <select
                      value={formState.selectedCategoryId}
                      onChange={(event) => updateForm({ selectedCategoryId: event.target.value })}
                      disabled={isBusy}
                    >
                      <option value="">Selectionner...</option>
                      {sortedCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={formState.newCategoryName}
                      onChange={(event) => updateForm({ newCategoryName: event.target.value })}
                      placeholder="Nom du nouveau dossier"
                      disabled={isBusy}
                    />
                  )}
                </fieldset>
              ) : (
                <p className="panel-hint">Dossier : {contextLabel}</p>
              )}
            </>
          ) : (
            <>
              <label className="field">
                <span>{contextLabel && contextLabel !== 'Racine' ? 'Nom de l\'enveloppe' : 'Nom du dossier'}</span>
                <input
                  type="text"
                  value={formState.folderName}
                  onChange={(event) => updateForm({ folderName: event.target.value })}
                  placeholder="Ex. JS avance"
                  required
                  disabled={isBusy}
                />
              </label>

              <fieldset className="field">
                <legend>{contextLabel && contextLabel !== 'Racine' ? 'Couleur de l\'enveloppe' : 'Couleur du dossier'}</legend>
                <div className="color-grid">
                  {COLOR_OPTIONS.map(({ value, label }) => {
                    const palette = PASTEL_COLORS[value]
                    const selected = formState.folderColor === value
                    return (
                      <button
                        key={value}
                        type="button"
                        className={`color-option ${selected ? 'is-selected' : ''}`}
                        style={{
                          backgroundColor: palette.bg,
                          borderColor: palette.accent
                        }}
                        onClick={() => updateForm({ folderColor: value })}
                        aria-label={label}
                        aria-pressed={selected}
                        disabled={isBusy}
                      >
                        {selected && <span>✓</span>}
                      </button>
                    )
                  })}
                </div>
              </fieldset>
            </>
          )}

          {error && <p className="form-error">{error}</p>}

          <footer className="add-panel-footer">
            {mode === 'edit' && (
              <button type="button" className="danger-button" onClick={handleDelete} disabled={isBusy}>
                Supprimer
              </button>
            )}
            <div className="actions-right">
              <button type="button" className="ghost-button" onClick={handleClose} disabled={isBusy}>
                Annuler
              </button>
              <button type="submit" className="primary-button" disabled={isBusy}>
                Valider
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  )
}

export default ItemPanel
