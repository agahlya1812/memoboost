import { PrismaClient } from '@prisma/client'
import express from 'express'
import cors from 'cors'
import { createHash } from 'node:crypto'

const app = express()

// Configuration Prisma pour Render
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})

const ALLOWED_COLORS = new Set(['red', 'orange', 'yellow', 'green', 'blue', 'violet', 'pink', 'gray'])
const ALLOWED_MASTERY = new Set(['unknown', 'review', 'known'])
const AUTH_HEADER = 'x-user-id'
const PASSWORD_SALT = process.env.MEMOBOOST_SALT || 'memoboost-salt'

app.use(cors({
  origin: [
    'https://agahlya1812.github.io',
    'https://agahlya1812.github.io/memoboost',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id']
}))
app.use(express.json())

const normalizeEmail = (value) => String(value || '').trim().toLowerCase()
const hashPassword = (value) => createHash('sha256').update(String(value || '') + PASSWORD_SALT).digest('hex')
const verifyPassword = (value, hash) => hashPassword(value) === hash

const normalizeMasteryStatus = (value, fallback = 'unknown') => {
  if (!value) return fallback
  const normalized = String(value).toLowerCase()
  return ALLOWED_MASTERY.has(normalized) ? normalized : fallback
}

const normalizeColor = (value, fallback = 'blue') => {
  if (!value) return fallback
  const normalized = String(value).toLowerCase()
  return ALLOWED_COLORS.has(normalized) ? normalized : fallback
}

async function authenticate(req, res) {
  const userId = req.header(AUTH_HEADER)
  if (!userId) {
    res.status(401).json({ error: 'Authentification requise.' })
    return null
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } })
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

const serializeUser = (user) => ({ id: user.id, email: user.email, name: user.name || '' })

// Routes
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body || {}
  const cleanEmail = normalizeEmail(email)
  const cleanPassword = typeof password === 'string' ? password : ''

  if (!cleanEmail || !cleanPassword || cleanPassword.length < 6) {
    return res.status(400).json({ error: 'Email et mot de passe (6 caracteres minimum) requis.' })
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } })
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
    const user = await prisma.user.findUnique({ where: { email: cleanEmail } })
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
    if (!context) return
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
    if (!context) return
    const { user } = context

    const category = await prisma.category.findFirst({
      where: { id: categoryId, userId: user.id }
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
    if (!context) return
    const { user } = context

    const card = await prisma.card.findFirst({
      where: { id: id, userId: user.id }
    })

    if (!card) {
      return res.status(404).json({ error: 'Carte introuvable.' })
    }

    const category = await prisma.category.findFirst({
      where: { id: categoryId, userId: user.id }
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
    if (!context) return
    const { user } = context

    const card = await prisma.card.findFirst({
      where: { id: id, userId: user.id }
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
    if (!context) return
    const { user } = context

    const card = await prisma.card.findFirst({
      where: { id: id, userId: user.id }
    })

    if (!card) {
      return res.status(404).json({ error: 'Carte introuvable.' })
    }

    await prisma.card.delete({ where: { id } })
    res.status(204).send()
  } catch (error) {
    console.error('Failed to delete card', error)
    res.status(500).json({ error: 'Suppression impossible pour le moment.' })
  }
})

app.post('/api/categories', async (req, res) => {
  const { name, parentId: rawParentId, color: rawColor } = req.body || {}
  const cleanName = name ? name.trim() : ''
  const parentId = rawParentId === undefined || rawParentId === null || rawParentId === '' ? null : String(rawParentId)
  const color = normalizeColor(rawColor)

  if (!cleanName) {
    return res.status(400).json({ error: 'Le nom du dossier est obligatoire.' })
  }

  try {
    const context = await authenticate(req, res)
    if (!context) return
    const { user } = context

    if (parentId) {
      const parent = await prisma.category.findFirst({
        where: { id: parentId, userId: user.id }
      })
      if (!parent) {
        return res.status(404).json({ error: 'Dossier parent introuvable.' })
      }
    }

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
  const cleanName = name ? name.trim() : ''
  const parentId = rawParentId === undefined || rawParentId === null || rawParentId === '' ? null : String(rawParentId)

  if (!cleanName) {
    return res.status(400).json({ error: 'Le nom du dossier est obligatoire.' })
  }

  try {
    const context = await authenticate(req, res)
    if (!context) return
    const { user } = context

    const category = await prisma.category.findFirst({
      where: { id: id, userId: user.id }
    })

    if (!category) {
      return res.status(404).json({ error: 'Dossier introuvable.' })
    }

    if (parentId) {
      const parent = await prisma.category.findFirst({
        where: { id: parentId, userId: user.id }
      })
      if (!parent) {
        return res.status(404).json({ error: 'Dossier parent introuvable.' })
      }
      if (parentId === id) {
        return res.status(400).json({ error: 'Un dossier ne peut etre son propre parent.' })
      }
    }

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
    if (!context) return
    const { user } = context

    const category = await prisma.category.findFirst({
      where: { id: id, userId: user.id }
    })

    if (!category) {
      return res.status(404).json({ error: 'Dossier introuvable.' })
    }

    // Récupérer tous les descendants
    const allCategories = await prisma.category.findMany({
      where: { userId: user.id }
    })

    const collectDescendantCategoryIds = (categories, rootId, userId) => {
      const stack = [rootId]
      const visited = new Set()
      while (stack.length) {
        const current = stack.pop()
        if (visited.has(current)) continue
        visited.add(current)
        categories.forEach((cat) => {
          if (cat.userId !== userId) return
          if ((cat.parentId ?? null) === current) {
            stack.push(cat.id)
          }
        })
      }
      return Array.from(visited)
    }

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

// Démarrage du serveur pour Render
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`MemoBoost API running on port ${PORT}`)
})

export default app