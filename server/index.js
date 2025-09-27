import express from 'express'
import cors from 'cors'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID, createHash } from 'node:crypto'

const app = express()
const PORT = process.env.PORT || 4000

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '..')
const DATA_DIR = path.join(ROOT_DIR, 'data')
const STORE_PATH = path.join(DATA_DIR, 'store.json')

const ALLOWED_COLORS = new Set(['red', 'orange', 'yellow', 'green', 'blue', 'violet', 'pink', 'gray'])
const ALLOWED_MASTERY = new Set(['unknown', 'review', 'known'])
const AUTH_HEADER = 'x-user-id'
const PASSWORD_SALT = process.env.MEMOBOOST_SALT || 'memoboost-salt'

<<<<<<< HEAD
app.use(cors({
  origin: [
    'http://localhost:5176',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'https://agahlya1812.github.io',
    'https://agahlya1812.github.io/memoboost'
  ],
  credentials: true
}))
=======
app.use(cors())
>>>>>>> a2e33565188feef5fcf597a7844cb430c821ecaa
app.use(express.json())

const normalizeCategoryName = (name) => name.trim()
const normalizeParentId = (value) => (value === undefined || value === null || value === '' ? null : String(value))
const normalizeColor = (value, fallback = 'blue') => {
  if (!value) {
    return fallback
  }
  const normalized = String(value).toLowerCase()
  return ALLOWED_COLORS.has(normalized) ? normalized : fallback
}

const normalizeMasteryStatus = (value, fallback = 'unknown') => {
  if (!value) {
    return fallback
  }
  const normalized = String(value).toLowerCase()
  return ALLOWED_MASTERY.has(normalized) ? normalized : fallback
}

const normalizeEmail = (value) => String(value || '').trim().toLowerCase()
const hashPassword = (value) => createHash('sha256').update(String(value || '') + PASSWORD_SALT).digest('hex')
const verifyPassword = (value, hash) => hashPassword(value) === hash

function assignLegacyContent(store, userId) {
  if (!userId) {
    return false
  }
  let mutated = false
  store.categories.forEach((category) => {
    if (!category.userId) {
      category.userId = userId
      mutated = true
    }
  })
  store.cards.forEach((card) => {
    if (!card.userId) {
      card.userId = userId
      mutated = true
    }
  })
  return mutated
}

async function ensureStore() {
  try {
    await fs.access(STORE_PATH)
  } catch (error) {
    const fallback = {
      users: [],
      categories: [],
      cards: []
    }
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.writeFile(STORE_PATH, JSON.stringify(fallback, null, 2), 'utf-8')
  }
}

async function readStore() {
  const raw = await fs.readFile(STORE_PATH, 'utf-8')
  const data = JSON.parse(raw)

  if (!Array.isArray(data.users)) {
    data.users = []
  } else {
    data.users = data.users.map((user) => ({
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash || '',
      name: user.name || ''
    }))
  }

  if (Array.isArray(data.categories)) {
    data.categories = data.categories.map((category) => ({
      ...category,
      color: normalizeColor(category.color, 'blue'),
      userId: category.userId || null
    }))
  } else {
    data.categories = []
  }

  if (Array.isArray(data.cards)) {
    data.cards = data.cards.map((card) => ({
      ...card,
      masteryStatus: normalizeMasteryStatus(card.masteryStatus, 'unknown'),
      userId: card.userId || null
    }))
  } else {
    data.cards = []
  }

  return data
}

async function writeStore(store) {
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8')
}

async function authenticate(req, res) {
  const userId = req.header(AUTH_HEADER)

  if (!userId) {
    res.status(401).json({ error: 'Authentification requise.' })
    return null
  }

  await ensureStore()
  const store = await readStore()
  const user = store.users.find((item) => item.id === userId)

  if (!user) {
    res.status(401).json({ error: 'Session invalide.' })
    return null
  }

  const migrated = assignLegacyContent(store, userId)

  if (migrated) {
    await writeStore(store)
  }

  return { store, user }
}

function findCategory(store, id, userId = null) {
  return store.categories.find((category) => {
    if (category.id !== id) {
      return false
    }
    if (userId && category.userId !== userId) {
      return false
    }
    return true
  })
}

function collectDescendantCategoryIds(store, rootId, userId) {
  const stack = [rootId]
  const visited = new Set()

  while (stack.length) {
    const current = stack.pop()
    if (visited.has(current)) {
      continue
    }
    visited.add(current)
    store.categories.forEach((category) => {
      if (category.userId !== userId) {
        return
      }
      if ((category.parentId ?? null) === current) {
        stack.push(category.id)
      }
    })
  }

  return Array.from(visited)
}

function validateParent(store, parentId, categoryId, userId) {
  if (parentId === null) {
    return { ok: true }
  }

  const parent = findCategory(store, parentId, userId)
  if (!parent) {
    return { ok: false, status: 404, message: 'Dossier parent introuvable.' }
  }

  if (categoryId && parentId === categoryId) {
    return { ok: false, status: 400, message: 'Un dossier ne peut etre son propre parent.' }
  }

  if (categoryId) {
    const descendants = collectDescendantCategoryIds(store, categoryId, userId)
    if (descendants.includes(parentId)) {
      return { ok: false, status: 400, message: 'Le parent choisi est un sous-dossier du dossier courant.' }
    }
  }

  return { ok: true }
}

const serializeUser = (user) => ({ id: user.id, email: user.email, name: user.name || '' })

app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body || {}
  const cleanEmail = normalizeEmail(email)
  const cleanPassword = typeof password === 'string' ? password : ''

  if (!cleanEmail || !cleanPassword || cleanPassword.length < 6) {
    return res.status(400).json({ error: 'Email et mot de passe (6 caracteres minimum) requis.' })
  }

  try {
    await ensureStore()
    const store = await readStore()

    if (store.users.some((user) => user.email === cleanEmail)) {
      return res.status(409).json({ error: 'Un compte existe deja avec cet email.' })
    }

    const user = {
      id: `user-${randomUUID()}`,
      email: cleanEmail,
      passwordHash: hashPassword(cleanPassword),
      name: typeof name === 'string' ? name.trim() : ''
    }

    store.users.push(user)

    assignLegacyContent(store, user.id)
    await writeStore(store)

    res.status(201).json({ user: serializeUser(user) })
  } catch (error) {
    console.error('Failed to register user', error)
    res.status(500).json({ error: "Inscription impossible pour le moment." })
  }
})

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {}
  const cleanEmail = normalizeEmail(email)
  const cleanPassword = typeof password === 'string' ? password : ''

  if (!cleanEmail || !cleanPassword) {
    return res.status(400).json({ error: 'Identifiants requis.' })
  }

  try {
    await ensureStore()
    const store = await readStore()
    const user = store.users.find((item) => item.email === cleanEmail)

    if (!user || !verifyPassword(cleanPassword, user.passwordHash)) {
      return res.status(401).json({ error: 'Identifiants invalides.' })
    }

    const migrated = assignLegacyContent(store, user.id)
    if (migrated) {
      await writeStore(store)
    }

    res.json({ user: serializeUser(user) })
  } catch (error) {
    console.error('Failed to login user', error)
    res.status(500).json({ error: 'Connexion impossible pour le moment.' })
  }
})

app.get('/api/state', async (req, res) => {
  try {
    const context = await authenticate(req, res)
    if (!context) {
      return
    }
    const { store, user } = context
    const categories = store.categories.filter((category) => category.userId === user.id)
    const cards = store.cards.filter((card) => card.userId === user.id)
    res.json({ categories, cards, user: serializeUser(user) })
  } catch (error) {
    console.error('Failed to read store', error)
    res.status(500).json({ error: "Impossible de lire les donnees." })
  }
})

app.post('/api/cards', async (req, res) => {
  const { question, answer, categoryId, masteryStatus } = req.body || {}

  if (!question || !answer || !categoryId) {
    return res.status(400).json({ error: 'Question, reponse et dossier sont obligatoires.' })
  }

  try {
    const context = await authenticate(req, res)
    if (!context) {
      return
    }
    const { store, user } = context

    const category = findCategory(store, categoryId, user.id)
    if (!category) {
      return res.status(404).json({ error: 'Dossier inconnu.' })
    }

    const card = {
      id: `card-${randomUUID()}`,
      question: question.trim(),
      answer: answer.trim(),
      categoryId,
      masteryStatus: normalizeMasteryStatus(masteryStatus, 'unknown'),
      userId: user.id
    }

    store.cards.push(card)
    await writeStore(store)

    res.status(201).json({ card })
  } catch (error) {
    console.error('Failed to add card', error)
    res.status(500).json({ error: "Impossible d'enregistrer la carte." })
  }
})

app.put('/api/cards/:id', async (req, res) => {
  const { id } = req.params
  const { question, answer, categoryId, masteryStatus } = req.body || {}

  if (!question || !answer || !categoryId) {
    return res.status(400).json({ error: 'Question, reponse et dossier sont obligatoires.' })
  }

  try {
    const context = await authenticate(req, res)
    if (!context) {
      return
    }
    const { store, user } = context
    const card = store.cards.find((item) => item.id === id && item.userId === user.id)

    if (!card) {
      return res.status(404).json({ error: 'Carte introuvable.' })
    }

    const category = findCategory(store, categoryId, user.id)
    if (!category) {
      return res.status(404).json({ error: 'Dossier inconnu.' })
    }

    card.question = question.trim()
    card.answer = answer.trim()
    card.categoryId = categoryId
    card.masteryStatus = normalizeMasteryStatus(masteryStatus, card.masteryStatus || 'unknown')

    await writeStore(store)
    res.json({ card })
  } catch (error) {
    console.error('Failed to update card', error)
    res.status(500).json({ error: 'Mise a jour impossible pour le moment.' })
  }
})


app.patch('/api/cards/:id/status', async (req, res) => {
  const { id } = req.params
  const { masteryStatus } = req.body || {}

  if (!masteryStatus) {
    return res.status(400).json({ error: 'Statut requis.' })
  }

  try {
    const context = await authenticate(req, res)
    if (!context) {
      return
    }
    const { store, user } = context
    const card = store.cards.find((item) => item.id === id && item.userId === user.id)

    if (!card) {
      return res.status(404).json({ error: 'Carte introuvable.' })
    }

    card.masteryStatus = normalizeMasteryStatus(masteryStatus, card.masteryStatus || 'unknown')

    await writeStore(store)

    res.json({ card })
  } catch (error) {
    console.error('Failed to update mastery status', error)
    res.status(500).json({ error: 'Mise a jour du statut impossible.' })
  }
})

app.delete('/api/cards/:id', async (req, res) => {
  const { id } = req.params

  try {
    const context = await authenticate(req, res)
    if (!context) {
      return
    }
    const { store, user } = context
    const initialLength = store.cards.length
    store.cards = store.cards.filter((card) => !(card.id === id && card.userId === user.id))

    if (store.cards.length === initialLength) {
      return res.status(404).json({ error: 'Carte introuvable.' })
    }

    await writeStore(store)
    res.status(204).send()
  } catch (error) {
    console.error('Failed to delete card', error)
    res.status(500).json({ error: 'Suppression impossible pour le moment.' })
  }
})

app.post('/api/categories', async (req, res) => {
  const { name, parentId: rawParentId, color: rawColor } = req.body || {}
  const cleanName = name ? normalizeCategoryName(name) : ''
  const parentId = normalizeParentId(rawParentId)
  const color = normalizeColor(rawColor)

  if (!cleanName) {
    return res.status(400).json({ error: 'Le nom du dossier est obligatoire.' })
  }

  try {
    const context = await authenticate(req, res)
    if (!context) {
      return
    }
    const { store, user } = context

    const parentValidation = validateParent(store, parentId, null, user.id)
    if (!parentValidation.ok) {
      return res.status(parentValidation.status).json({ error: parentValidation.message })
    }

    if (
      store.categories.some(
        (category) =>
          category.userId === user.id &&
          category.name.trim().toLowerCase() === cleanName.toLowerCase() &&
          (category.parentId ?? null) === parentId
      )
    ) {
      return res.status(409).json({ error: 'Un dossier portant ce nom existe deja a cet emplacement.' })
    }

    const category = {
      id: `cat-${randomUUID()}`,
      name: cleanName,
      parentId,
      color,
      userId: user.id
    }

    store.categories.push(category)
    await writeStore(store)

    res.status(201).json({ category })
  } catch (error) {
    console.error('Failed to add category', error)
    res.status(500).json({ error: "Impossible d'enregistrer le dossier." })
  }
})

app.put('/api/categories/:id', async (req, res) => {
  const { id } = req.params
  const { name, parentId: rawParentId, color: rawColor } = req.body || {}
  const cleanName = name ? normalizeCategoryName(name) : ''
  const parentId = normalizeParentId(rawParentId)

  if (!cleanName) {
    return res.status(400).json({ error: 'Le nom du dossier est obligatoire.' })
  }

  try {
    const context = await authenticate(req, res)
    if (!context) {
      return
    }
    const { store, user } = context
    const category = findCategory(store, id, user.id)

    if (!category) {
      return res.status(404).json({ error: 'Dossier introuvable.' })
    }

    const parentValidation = validateParent(store, parentId, id, user.id)
    if (!parentValidation.ok) {
      return res.status(parentValidation.status).json({ error: parentValidation.message })
    }

    if (
      store.categories.some(
        (item) =>
          item.id !== id &&
          item.userId === user.id &&
          item.name.trim().toLowerCase() === cleanName.toLowerCase() &&
          (item.parentId ?? null) === parentId
      )
    ) {
      return res.status(409).json({ error: 'Un dossier portant ce nom existe deja a cet emplacement.' })
    }

    category.name = cleanName
    category.parentId = parentId
    category.color = normalizeColor(rawColor, category.color || 'blue')

    await writeStore(store)

    res.json({ category })
  } catch (error) {
    console.error('Failed to update category', error)
    res.status(500).json({ error: 'Mise a jour du dossier impossible.' })
  }
})

app.delete('/api/categories/:id', async (req, res) => {
  const { id } = req.params

  try {
    const context = await authenticate(req, res)
    if (!context) {
      return
    }
    const { store, user } = context
    const category = findCategory(store, id, user.id)

    if (!category) {
      return res.status(404).json({ error: 'Dossier introuvable.' })
    }

    const allCategoryIds = collectDescendantCategoryIds(store, id, user.id)
    const cardIdsToRemove = new Set()

    store.cards.forEach((card) => {
      if (card.userId === user.id && allCategoryIds.includes(card.categoryId)) {
        cardIdsToRemove.add(card.id)
      }
    })

    store.categories = store.categories.filter((item) => !(item.userId === user.id && allCategoryIds.includes(item.id)))
    store.cards = store.cards.filter((card) => !(card.userId === user.id && cardIdsToRemove.has(card.id)))

    await writeStore(store)

    res.json({ removedCategoryIds: allCategoryIds, removedCardIds: Array.from(cardIdsToRemove) })
  } catch (error) {
    console.error('Failed to delete category', error)
    res.status(500).json({ error: 'Suppression du dossier impossible.' })
  }
})

<<<<<<< HEAD
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'MemoBoost API is running' })
})

=======
>>>>>>> a2e33565188feef5fcf597a7844cb430c821ecaa
app.use((req, res) => {
  res.status(404).json({ error: 'Route inconnue.' })
})

app.listen(PORT, async () => {
  await ensureStore()
  console.log(`MemoBoost API en ecoute sur http://localhost:${PORT}`)
})
