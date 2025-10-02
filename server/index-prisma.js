import express from 'express'
import cors from 'cors'
import { randomUUID, createHash } from 'node:crypto'
import prisma, { migrateFromJsonStore } from './database.js'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

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

// Configuration pour Vercel
const isVercel = process.env.VERCEL === '1'

// Configuration CORS pour GitHub Pages
app.use(
  cors({
    origin: true, // Permet toutes les origines
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id']
  })
)
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

async function authenticate(req, res) {
  const userId = req.header(AUTH_HEADER)

  if (!userId) {
    res.status(401).json({ error: 'Authentification requise.' })
    return null
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      res.status(401).json({ error: 'Session invalide.' })
      return null
    }

    return { user }
  } catch (error) {
    console.error('Authentication error:', error)
    res.status(500).json({ error: 'Erreur d\'authentification.' })
    return null
  }
}

function findCategory(categories, id, userId = null) {
  return categories.find((category) => {
    if (category.id !== id) {
      return false
    }
    if (userId && category.userId !== userId) {
      return false
    }
    return true
  })
}

function collectDescendantCategoryIds(categories, rootId, userId) {
  const stack = [rootId]
  const visited = new Set()

  while (stack.length) {
    const current = stack.pop()
    if (visited.has(current)) {
      continue
    }
    visited.add(current)
    categories.forEach((category) => {
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

function validateParent(categories, parentId, categoryId, userId) {
  if (parentId === null) {
    return { ok: true }
  }

  const parent = findCategory(categories, parentId, userId)
  if (!parent) {
    return { ok: false, status: 404, message: 'Dossier parent introuvable.' }
  }

  if (categoryId && parentId === categoryId) {
    return { ok: false, status: 400, message: 'Un dossier ne peut etre son propre parent.' }
  }

  if (categoryId) {
    const descendants = collectDescendantCategoryIds(categories, categoryId, userId)
    if (descendants.includes(parentId)) {
      return { ok: false, status: 400, message: 'Le parent choisi est un sous-dossier du dossier courant.' }
    }
  }

  return { ok: true }
}

const serializeUser = (user) => ({ id: user.id, email: user.email, name: user.name || '' })

// Migration depuis le store JSON existant (une seule fois)
async function migrateIfNeeded() {
  // Skip migration on Vercel
  if (isVercel) {
    console.log('Running on Vercel, skipping JSON migration')
    return
  }
  
  try {
    const raw = await fs.readFile(STORE_PATH, 'utf-8')
    const jsonData = JSON.parse(raw)
    
    // Vérifier si on a déjà des données en base
    const userCount = await prisma.user.count()
    if (userCount === 0 && (jsonData.users?.length > 0 || jsonData.categories?.length > 0 || jsonData.cards?.length > 0)) {
      console.log('Migrating data from JSON store...')
      await migrateFromJsonStore(jsonData)
    }
  } catch (error) {
    // Pas de fichier JSON ou erreur de lecture, continuer sans migration
    console.log('No JSON store found or error reading it, skipping migration')
  }
}

app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body || {}
  const cleanEmail = normalizeEmail(email)
  const cleanPassword = typeof password === 'string' ? password : ''

  if (!cleanEmail || !cleanPassword || cleanPassword.length < 6) {
    return res.status(400).json({ error: 'Email et mot de passe (6 caracteres minimum) requis.' })
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail }
    })

    if (existingUser) {
      return res.status(409).json({ error: 'Un compte existe deja avec cet email.' })
    }

    const user = await prisma.user.create({
      data: {
        email: cleanEmail,
        passwordHash: hashPassword(cleanPassword),
        name: typeof name === 'string' ? name.trim() : ''
      }
    })

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
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail }
    })

    if (!user || !verifyPassword(cleanPassword, user.passwordHash)) {
      return res.status(401).json({ error: 'Identifiants invalides.' })
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
    const { user } = context

    const categories = await prisma.category.findMany({
      where: { userId: user.id },
      orderBy: { name: 'asc' }
    })

    const cards = await prisma.card.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    })

    res.json({ categories, cards, user: serializeUser(user) })
  } catch (error) {
    console.error('Failed to read state', error)
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
    const { user } = context

    const category = await prisma.category.findFirst({
      where: { 
        id: categoryId,
        userId: user.id 
      }
    })

    if (!category) {
      return res.status(404).json({ error: 'Dossier inconnu.' })
    }

    const card = await prisma.card.create({
      data: {
        question: question.trim(),
        answer: answer.trim(),
        categoryId,
        masteryStatus: normalizeMasteryStatus(masteryStatus, 'unknown'),
        userId: user.id
      }
    })

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
    const { user } = context

    const card = await prisma.card.findFirst({
      where: { 
        id: id,
        userId: user.id 
      }
    })

    if (!card) {
      return res.status(404).json({ error: 'Carte introuvable.' })
    }

    const category = await prisma.category.findFirst({
      where: { 
        id: categoryId,
        userId: user.id 
      }
    })

    if (!category) {
      return res.status(404).json({ error: 'Dossier inconnu.' })
    }

    const updatedCard = await prisma.card.update({
      where: { id },
      data: {
        question: question.trim(),
        answer: answer.trim(),
        categoryId,
        masteryStatus: normalizeMasteryStatus(masteryStatus, card.masteryStatus || 'unknown')
      }
    })

    res.json({ card: updatedCard })
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
    const { user } = context

    const card = await prisma.card.findFirst({
      where: { 
        id: id,
        userId: user.id 
      }
    })

    if (!card) {
      return res.status(404).json({ error: 'Carte introuvable.' })
    }

    const updatedCard = await prisma.card.update({
      where: { id },
      data: {
        masteryStatus: normalizeMasteryStatus(masteryStatus, card.masteryStatus || 'unknown')
      }
    })

    res.json({ card: updatedCard })
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
    const { user } = context

    const card = await prisma.card.findFirst({
      where: { 
        id: id,
        userId: user.id 
      }
    })

    if (!card) {
      return res.status(404).json({ error: 'Carte introuvable.' })
    }

    await prisma.card.delete({
      where: { id }
    })

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
    const { user } = context

    // Vérifier le parent si spécifié
    if (parentId) {
      const parent = await prisma.category.findFirst({
        where: { 
          id: parentId,
          userId: user.id 
        }
      })

      if (!parent) {
        return res.status(404).json({ error: 'Dossier parent introuvable.' })
      }
    }

    // Vérifier les doublons
    const existingCategory = await prisma.category.findFirst({
      where: {
        userId: user.id,
        name: cleanName,
        parentId: parentId || null
      }
    })

    if (existingCategory) {
      return res.status(409).json({ error: 'Un dossier portant ce nom existe deja a cet emplacement.' })
    }

    const category = await prisma.category.create({
      data: {
        name: cleanName,
        parentId,
        color,
        userId: user.id
      }
    })

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
    const { user } = context

    const category = await prisma.category.findFirst({
      where: { 
        id: id,
        userId: user.id 
      }
    })

    if (!category) {
      return res.status(404).json({ error: 'Dossier introuvable.' })
    }

    // Vérifier le parent si spécifié
    if (parentId) {
      const parent = await prisma.category.findFirst({
        where: { 
          id: parentId,
          userId: user.id 
        }
      })

      if (!parent) {
        return res.status(404).json({ error: 'Dossier parent introuvable.' })
      }

      if (parentId === id) {
        return res.status(400).json({ error: 'Un dossier ne peut etre son propre parent.' })
      }
    }

    // Vérifier les doublons
    const existingCategory = await prisma.category.findFirst({
      where: {
        id: { not: id },
        userId: user.id,
        name: cleanName,
        parentId: parentId || null
      }
    })

    if (existingCategory) {
      return res.status(409).json({ error: 'Un dossier portant ce nom existe deja a cet emplacement.' })
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        name: cleanName,
        parentId,
        color: normalizeColor(rawColor, category.color || 'blue')
      }
    })

    res.json({ category: updatedCategory })
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
    const { user } = context

    const category = await prisma.category.findFirst({
      where: { 
        id: id,
        userId: user.id 
      }
    })

    if (!category) {
      return res.status(404).json({ error: 'Dossier introuvable.' })
    }

    // Récupérer tous les descendants
    const allCategories = await prisma.category.findMany({
      where: { userId: user.id }
    })

    const allCategoryIds = collectDescendantCategoryIds(allCategories, id, user.id)

    // Supprimer les cartes associées
    await prisma.card.deleteMany({
      where: {
        userId: user.id,
        categoryId: { in: allCategoryIds }
      }
    })

    // Supprimer les catégories
    await prisma.category.deleteMany({
      where: {
        userId: user.id,
        id: { in: allCategoryIds }
      }
    })

    res.json({ removedCategoryIds: allCategoryIds, removedCardIds: [] })
  } catch (error) {
    console.error('Failed to delete category', error)
    res.status(500).json({ error: 'Suppression du dossier impossible.' })
  }
})

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'MemoBoost API is running' })
})

app.use((req, res) => {
  res.status(404).json({ error: 'Route inconnue.' })
})

app.listen(PORT, async () => {
  try {
    await migrateIfNeeded()
    console.log(`MemoBoost API with PostgreSQL en ecoute sur http://localhost:${PORT}`)
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
})
