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

// ────── CORS dynamique ──────
const allowedOrigins = [
  'http://localhost:5176',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'https://agahlya1812.github.io',
  'https://agahlya1812.github.io/memoboost'
]

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true) // permet Postman/curl
      if (allowedOrigins.includes(origin)) {
        return callback(null, true)
      } else {
        return callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true
  })
)

app.use(express.json())

// … toutes tes fonctions normalize*, hashPassword, authenticate, assignLegacyContent, etc. …

// Exemple : route health
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'MemoBoost API is running' })
})

// … toutes tes routes API (auth/register, auth/login, state, cards, categories…) inchangées …

// Route 404 par défaut
app.use((req, res) => {
  res.status(404).json({ error: 'Route inconnue.' })
})

app.listen(PORT, async () => {
  await ensureStore()
  console.log(`MemoBoost API en écoute sur http://localhost:${PORT}`)
})