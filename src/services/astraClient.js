const BASE       = import.meta.env.VITE_ASTRA_URL
const PROJECT_ID = import.meta.env.VITE_ASTRA_PROJECT_ID
const TOKEN      = import.meta.env.VITE_ASTRA_TOKEN

export const isAstraEnabled = Boolean(BASE && PROJECT_ID && TOKEN)

const HEADERS = {
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
}

function esc(val) {
  if (val === null || val === undefined) return 'NULL'
  if (typeof val === 'number') return String(val)
  if (typeof val === 'boolean') return val ? '1' : '0'
  return `'${String(val).replace(/'/g, "''")}'`
}

// Tagged template literal pour construire du SQL de façon sécurisée
// ex: q`SELECT * FROM users WHERE id = ${userId}`
export function q(strings, ...vals) {
  return strings.reduce((acc, s, i) => acc + s + (i < vals.length ? esc(vals[i]) : ''), '')
}

export async function runSQL(query) {
  if (!isAstraEnabled) throw new Error('Astra non configuré')
  const res = await fetch(`${BASE}/projects/${PROJECT_ID}/sql`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ query }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || err.message || `Astra SQL error ${res.status}`)
  }
  const result = await res.json()
  const { columns, rows } = result
  if (!columns || !rows) return []
  return rows.map(row => Object.fromEntries(columns.map((col, i) => [col, row[i]])))
}
