import { isAstraEnabled, runSQL, q } from './astraClient'
import { isSupabaseEnabled, supabase } from './supabaseClient'

let authUserId = null

export function setAuthUserId(id) { authUserId = id || null }
export function getAuthUserId() { return authUserId }
export function clearAuthUserId() { authUserId = null }

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) }
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }
  if (authUserId) headers['X-User-Id'] = authUserId
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (response.status === 204) return null
  let data = null
  try { data = await response.json() } catch { data = null }
  if (!response.ok) {
    const message = data?.error || 'Une erreur est survenue.'
    const error = new Error(message)
    error.status = response.status
    error.body = data
    error.path = path
    throw error
  }
  return data
}

async function hashPassword(password) {
  const enc = new TextEncoder()
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(password))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

function now() { return new Date().toISOString() }

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function registerUser(payload) {
  if (isAstraEnabled) {
    const hash = await hashPassword(payload.password)
    const id = newId()
    const ts = now()
    try {
      await runSQL(q`
        INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
        VALUES (${id}, ${payload.email.trim().toLowerCase()}, ${hash}, ${payload.name || ''}, ${ts}, ${ts})
      `)
    } catch (err) {
      const msg = err.message?.toLowerCase() || ''
      if (msg.includes('unique') || msg.includes('duplicate') || msg.includes('already exists')) {
        throw new Error('Cet email est déjà utilisé.')
      }
      throw err
    }
    return { id, email: payload.email.trim().toLowerCase(), name: payload.name || '' }
  }
  if (isSupabaseEnabled) {
    const { data, error } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: { data: { name: payload.name || '' } }
    })
    if (error) throw new Error(error.message)
    return data.user
      ? { id: data.user.id, email: data.user.email, name: data.user.user_metadata?.name || '' }
      : null
  }
  const data = await request('/auth/register', { method: 'POST', body: JSON.stringify(payload) })
  return data.user
}

export async function loginUser(payload) {
  if (isAstraEnabled) {
    const hash = await hashPassword(payload.password)
    const rows = await runSQL(q`
      SELECT id, email, name FROM users
      WHERE email = ${payload.email.trim().toLowerCase()} AND password_hash = ${hash}
      LIMIT 1
    `)
    if (!rows.length) throw new Error('Email ou mot de passe incorrect.')
    return rows[0]
  }
  if (isSupabaseEnabled) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: payload.email,
      password: payload.password
    })
    if (error) throw new Error(error.message)
    return data.user
      ? { id: data.user.id, email: data.user.email, name: data.user.user_metadata?.name || '' }
      : null
  }
  const data = await request('/auth/login', { method: 'POST', body: JSON.stringify(payload) })
  return data.user
}

// ─── State ───────────────────────────────────────────────────────────────────

export async function fetchState() {
  if (isAstraEnabled) {
    if (!authUserId) return { user: null, cards: [], categories: [] }
    const [cats, cards, users] = await Promise.all([
      runSQL(q`SELECT * FROM categories WHERE user_id = ${authUserId} ORDER BY created_at ASC`),
      runSQL(q`SELECT * FROM cards WHERE user_id = ${authUserId} ORDER BY created_at ASC`),
      runSQL(q`SELECT id, email, name FROM users WHERE id = ${authUserId} LIMIT 1`),
    ])
    return {
      user: users[0] || null,
      categories: cats.map(c => ({
        id: c.id, name: c.name, parentId: c.parent_id, color: c.color || 'blue',
        createdAt: c.created_at, updatedAt: c.updated_at,
      })),
      cards: cards.map(r => ({
        id: r.id, question: r.question, answer: r.answer, categoryId: r.category_id,
        masteryStatus: r.mastery_status || 'unknown', imageUrl: r.image_url,
        createdAt: r.created_at, updatedAt: r.updated_at,
      })),
    }
  }
  if (isSupabaseEnabled) {
    const session = await supabase.auth.getSession()
    const userId = session?.data?.session?.user?.id
    if (!userId) return { user: null, cards: [], categories: [] }
    const [{ data: categories, error: catErr }, { data: cards, error: cardErr }] = await Promise.all([
      supabase.from('categories').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
      supabase.from('cards').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
    ])
    if (catErr) throw new Error(catErr.message)
    if (cardErr) throw new Error(cardErr.message)
    const currentUser = session?.data?.session?.user
    return {
      user: currentUser ? { id: currentUser.id, email: currentUser.email, name: currentUser.user_metadata?.name || '' } : null,
      categories: (categories || []).map(c => ({ id: c.id, name: c.name, parentId: c.parent_id, color: c.color || 'blue', createdAt: c.created_at, updatedAt: c.updated_at })),
      cards: (cards || []).map(r => ({ id: r.id, question: r.question, answer: r.answer, categoryId: r.category_id, masteryStatus: r.mastery_status || 'unknown', imageUrl: r.image_url, createdAt: r.created_at, updatedAt: r.updated_at })),
    }
  }
  return request('/state', { method: 'GET' })
}

// ─── Cards ───────────────────────────────────────────────────────────────────

export async function createCard(payload) {
  if (isAstraEnabled) {
    if (!authUserId) throw new Error('Non authentifié')
    const id = newId()
    const ts = now()
    await runSQL(q`
      INSERT INTO cards (id, user_id, category_id, question, answer, mastery_status, image_url, created_at, updated_at)
      VALUES (${id}, ${authUserId}, ${payload.categoryId}, ${payload.question}, ${payload.answer},
              ${payload.masteryStatus || 'unknown'}, ${payload.imageUrl || null}, ${ts}, ${ts})
    `)
    return { id, question: payload.question, answer: payload.answer, categoryId: payload.categoryId, masteryStatus: payload.masteryStatus || 'unknown', imageUrl: payload.imageUrl || null, createdAt: ts, updatedAt: ts }
  }
  if (isSupabaseEnabled) {
    const session = await supabase.auth.getSession()
    const userId = session?.data?.session?.user?.id
    if (!userId) throw new Error('Non authentifié')
    const { data, error } = await supabase.from('cards').insert({
      user_id: userId, question: payload.question, answer: payload.answer,
      category_id: payload.categoryId, mastery_status: payload.masteryStatus || 'unknown', image_url: payload.imageUrl || null,
    }).select('*').single()
    if (error) throw new Error(error.message)
    return { id: data.id, question: data.question, answer: data.answer, categoryId: data.category_id, masteryStatus: data.mastery_status || 'unknown', imageUrl: data.image_url, createdAt: data.created_at, updatedAt: data.updated_at }
  }
  const data = await request('/cards', { method: 'POST', body: JSON.stringify(payload) })
  return data.card
}

export async function updateCard(id, payload) {
  if (isAstraEnabled) {
    const ts = now()
    await runSQL(q`
      UPDATE cards SET question = ${payload.question}, answer = ${payload.answer},
        category_id = ${payload.categoryId}, mastery_status = ${payload.masteryStatus || 'unknown'},
        image_url = ${payload.imageUrl || null}, updated_at = ${ts}
      WHERE id = ${id} AND user_id = ${authUserId}
    `)
    return { id, question: payload.question, answer: payload.answer, categoryId: payload.categoryId, masteryStatus: payload.masteryStatus || 'unknown', imageUrl: payload.imageUrl || null, updatedAt: ts }
  }
  if (isSupabaseEnabled) {
    const { data, error } = await supabase.from('cards').update({
      question: payload.question, answer: payload.answer, category_id: payload.categoryId,
      mastery_status: payload.masteryStatus, image_url: payload.imageUrl,
    }).eq('id', id).select('*').single()
    if (error) throw new Error(error.message)
    return { id: data.id, question: data.question, answer: data.answer, categoryId: data.category_id, masteryStatus: data.mastery_status || 'unknown', imageUrl: data.image_url, createdAt: data.created_at, updatedAt: data.updated_at }
  }
  const data = await request(`/cards/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
  return data.card
}

export async function updateCardStatus(id, masteryStatus, snapshot) {
  try {
    if (isAstraEnabled) {
      const ts = now()
      await runSQL(q`UPDATE cards SET mastery_status = ${masteryStatus}, updated_at = ${ts} WHERE id = ${id} AND user_id = ${authUserId}`)
      return { id, masteryStatus, updatedAt: ts }
    }
    if (isSupabaseEnabled) {
      const { data, error } = await supabase.from('cards').update({ mastery_status: masteryStatus }).eq('id', id).select('*').single()
      if (error) throw new Error(error.message)
      return { id: data.id, question: data.question, answer: data.answer, categoryId: data.category_id, masteryStatus: data.mastery_status || 'unknown', imageUrl: data.image_url, createdAt: data.created_at, updatedAt: data.updated_at }
    }
    const data = await request(`/cards/${id}/status`, { method: 'PATCH', body: JSON.stringify({ masteryStatus }) })
    return data.card
  } catch (error) {
    const shouldFallback = error?.status === 404 || error?.status === 405
    if (!shouldFallback || !snapshot) throw error
    const { question, answer, categoryId } = snapshot
    if (!question || !answer || !categoryId) throw error
    return updateCard(id, { question, answer, categoryId, masteryStatus })
  }
}

export async function deleteCard(id) {
  if (isAstraEnabled) {
    await runSQL(q`DELETE FROM cards WHERE id = ${id} AND user_id = ${authUserId}`)
    return
  }
  if (isSupabaseEnabled) {
    const { error } = await supabase.from('cards').delete().eq('id', id)
    if (error) throw new Error(error.message)
    return
  }
  await request(`/cards/${id}`, { method: 'DELETE' })
}

// ─── Categories ──────────────────────────────────────────────────────────────

export async function createCategory(payload) {
  if (isAstraEnabled) {
    if (!authUserId) throw new Error('Non authentifié')
    const id = newId()
    const ts = now()
    await runSQL(q`
      INSERT INTO categories (id, user_id, name, parent_id, color, created_at, updated_at)
      VALUES (${id}, ${authUserId}, ${payload.name}, ${payload.parentId ?? null}, ${payload.color || 'blue'}, ${ts}, ${ts})
    `)
    return { id, name: payload.name, parentId: payload.parentId ?? null, color: payload.color || 'blue', createdAt: ts, updatedAt: ts }
  }
  if (isSupabaseEnabled) {
    const session = await supabase.auth.getSession()
    const userId = session?.data?.session?.user?.id
    if (!userId) throw new Error('Non authentifié')
    const { data, error } = await supabase.from('categories').insert({
      user_id: userId, name: payload.name, parent_id: payload.parentId ?? null, color: payload.color || 'blue',
    }).select('*').single()
    if (error) throw new Error(error.message)
    return { id: data.id, name: data.name, parentId: data.parent_id, color: data.color || 'blue', createdAt: data.created_at, updatedAt: data.updated_at }
  }
  const data = await request('/categories', { method: 'POST', body: JSON.stringify(payload) })
  return data.category
}

export async function updateCategory(id, payload) {
  if (isAstraEnabled) {
    const ts = now()
    await runSQL(q`
      UPDATE categories SET name = ${payload.name}, parent_id = ${payload.parentId ?? null},
        color = ${payload.color}, updated_at = ${ts}
      WHERE id = ${id} AND user_id = ${authUserId}
    `)
    return { id, name: payload.name, parentId: payload.parentId ?? null, color: payload.color, updatedAt: ts }
  }
  if (isSupabaseEnabled) {
    const { data, error } = await supabase.from('categories').update({
      name: payload.name, parent_id: payload.parentId ?? null, color: payload.color,
    }).eq('id', id).select('*').single()
    if (error) throw new Error(error.message)
    return { id: data.id, name: data.name, parentId: data.parent_id, color: data.color || 'blue', createdAt: data.created_at, updatedAt: data.updated_at }
  }
  const data = await request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
  return data.category
}

export async function deleteCategory(id) {
  if (isAstraEnabled) {
    await runSQL(q`DELETE FROM cards WHERE category_id = ${id} AND user_id = ${authUserId}`)
    await runSQL(q`DELETE FROM categories WHERE id = ${id} AND user_id = ${authUserId}`)
    return { ok: true }
  }
  if (isSupabaseEnabled) {
    const { error: cardErr } = await supabase.from('cards').delete().eq('category_id', id)
    if (cardErr && cardErr.code !== 'PGRST204') throw new Error(cardErr.message)
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) throw new Error(error.message)
    return { ok: true }
  }
  const data = await request(`/categories/${id}`, { method: 'DELETE' })
  return data
}

// ─── Images ──────────────────────────────────────────────────────────────────

export async function uploadCardImage(cardId, file) {
  if (isAstraEnabled) {
    throw new Error('Upload d\'image non disponible avec Astra. Utilisez une URL externe.')
  }
  if (!isSupabaseEnabled) {
    throw new Error('Upload d\'image non disponible en mode local')
  }
  const session = await supabase.auth.getSession()
  const userId = session?.data?.session?.user?.id
  if (!userId) throw new Error('Non authentifié')
  if (!file.type.startsWith('image/')) throw new Error('Le fichier doit être une image')
  if (file.size > 5 * 1024 * 1024) throw new Error('L\'image ne doit pas dépasser 5MB')
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}/${cardId}-${Date.now()}.${fileExt}`
  try {
    const { error: uploadError } = await supabase.storage.from('card-images').upload(fileName, file, { cacheControl: '3600', upsert: false })
    if (uploadError) throw new Error(`Erreur d'upload: ${uploadError.message}`)
    const { data: urlData } = supabase.storage.from('card-images').getPublicUrl(fileName)
    return urlData.publicUrl
  } catch (error) {
    if (error.message.includes('bucket') || error.message.includes('not found')) {
      throw new Error('Le stockage d\'images n\'est pas encore configuré.')
    }
    throw error
  }
}

export async function updateCardImage(cardId, imageUrl) {
  if (isAstraEnabled) {
    const ts = now()
    await runSQL(q`UPDATE cards SET image_url = ${imageUrl}, updated_at = ${ts} WHERE id = ${cardId} AND user_id = ${authUserId}`)
    return { id: cardId, imageUrl, updatedAt: ts }
  }
  if (isSupabaseEnabled) {
    try {
      const { data, error } = await supabase.from('cards').update({ image_url: imageUrl }).eq('id', cardId).select('*').single()
      if (error) {
        if (error.message.includes('image_url') || error.message.includes('column')) {
          throw new Error('La colonne image_url n\'existe pas. Veuillez exécuter le script de migration.')
        }
        throw new Error(error.message)
      }
      return { id: data.id, question: data.question, answer: data.answer, categoryId: data.category_id, masteryStatus: data.mastery_status || 'unknown', imageUrl: data.image_url, createdAt: data.created_at, updatedAt: data.updated_at }
    } catch (error) {
      if (error.message.includes('image_url') || error.message.includes('column')) {
        throw new Error('La colonne image_url n\'existe pas. Veuillez exécuter le script de migration.')
      }
      throw error
    }
  }
  const data = await request(`/cards/${cardId}/image`, { method: 'PATCH', body: JSON.stringify({ imageUrl }) })
  return data.card
}

// ─── Notes ───────────────────────────────────────────────────────────────────

export async function fetchNotes(categoryId) {
  if (isAstraEnabled) {
    if (!authUserId) return []
    const rows = await runSQL(q`
      SELECT * FROM notes WHERE user_id = ${authUserId} AND category_id = ${categoryId}
      ORDER BY created_at DESC
    `)
    return rows.map(n => ({ id: n.id, title: n.title, content: n.content, categoryId: n.category_id, createdAt: n.created_at, updatedAt: n.updated_at }))
  }
  if (isSupabaseEnabled) {
    const session = await supabase.auth.getSession()
    const userId = session?.data?.session?.user?.id
    if (!userId) return []
    const { data, error } = await supabase.from('notes').select('*').eq('user_id', userId).eq('category_id', categoryId).order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data || []).map(n => ({ id: n.id, title: n.title, content: n.content, categoryId: n.category_id, createdAt: n.created_at, updatedAt: n.updated_at }))
  }
  return []
}

export async function fetchAllNotes() {
  if (isAstraEnabled) {
    if (!authUserId) return []
    const rows = await runSQL(q`SELECT * FROM notes WHERE user_id = ${authUserId} ORDER BY updated_at DESC`)
    return rows.map(n => ({ id: n.id, title: n.title, content: n.content, categoryId: n.category_id, createdAt: n.created_at, updatedAt: n.updated_at }))
  }
  if (isSupabaseEnabled) {
    const session = await supabase.auth.getSession()
    const userId = session?.data?.session?.user?.id
    if (!userId) return []
    const { data, error } = await supabase.from('notes').select('*').eq('user_id', userId).order('updated_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data || []).map(n => ({ id: n.id, title: n.title, content: n.content, categoryId: n.category_id, createdAt: n.created_at, updatedAt: n.updated_at }))
  }
  return []
}

export async function createNote(payload) {
  if (isAstraEnabled) {
    if (!authUserId) throw new Error('Non authentifié')
    const id = newId()
    const ts = now()
    await runSQL(q`
      INSERT INTO notes (id, user_id, category_id, title, content, created_at, updated_at)
      VALUES (${id}, ${authUserId}, ${payload.categoryId}, ${payload.title || 'Note sans titre'}, ${payload.content || ''}, ${ts}, ${ts})
    `)
    return { id, title: payload.title || 'Note sans titre', content: payload.content || '', categoryId: payload.categoryId, createdAt: ts, updatedAt: ts }
  }
  if (isSupabaseEnabled) {
    const session = await supabase.auth.getSession()
    const userId = session?.data?.session?.user?.id
    if (!userId) throw new Error('Non authentifié')
    const { data, error } = await supabase.from('notes').insert({
      user_id: userId, category_id: payload.categoryId, title: payload.title || 'Note sans titre', content: payload.content || '',
    }).select('*').single()
    if (error) throw new Error(error.message)
    return { id: data.id, title: data.title, content: data.content, categoryId: data.category_id, createdAt: data.created_at, updatedAt: data.updated_at }
  }
  throw new Error('Aucun backend configuré')
}

export async function updateNote(id, payload) {
  if (isAstraEnabled) {
    if (!authUserId) throw new Error('Non authentifié')
    const ts = now()
    await runSQL(q`
      UPDATE notes SET title = ${payload.title}, content = ${payload.content}, updated_at = ${ts}
      WHERE id = ${id} AND user_id = ${authUserId}
    `)
    return { id, title: payload.title, content: payload.content, updatedAt: ts }
  }
  if (isSupabaseEnabled) {
    const session = await supabase.auth.getSession()
    const userId = session?.data?.session?.user?.id
    if (!userId) throw new Error('Non authentifié')
    const { data, error } = await supabase.from('notes').update({ title: payload.title, content: payload.content, updated_at: new Date().toISOString() }).eq('id', id).eq('user_id', userId).select('*').single()
    if (error) throw new Error(error.message)
    return { id: data.id, title: data.title, content: data.content, categoryId: data.category_id, createdAt: data.created_at, updatedAt: data.updated_at }
  }
  throw new Error('Aucun backend configuré')
}

export async function deleteNote(id) {
  if (isAstraEnabled) {
    if (!authUserId) throw new Error('Non authentifié')
    await runSQL(q`DELETE FROM notes WHERE id = ${id} AND user_id = ${authUserId}`)
    return null
  }
  if (isSupabaseEnabled) {
    const session = await supabase.auth.getSession()
    const userId = session?.data?.session?.user?.id
    if (!userId) throw new Error('Non authentifié')
    const { error } = await supabase.from('notes').delete().eq('id', id).eq('user_id', userId)
    if (error) throw new Error(error.message)
    return null
  }
  throw new Error('Aucun backend configuré')
}
