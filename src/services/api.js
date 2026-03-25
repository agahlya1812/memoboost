import { isSupabaseEnabled, supabase } from './supabaseClient'

let authUserId = null

export function setAuthUserId(userId) {
  authUserId = userId || null
}

export function getAuthUserId() {
  return authUserId
}

export function clearAuthUserId() {
  authUserId = null
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) }

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  if (authUserId) {
    headers['X-User-Id'] = authUserId
  }

  const config = {
    ...options,
    headers
  }

  const response = await fetch(`${API_BASE}${path}`, config)

  if (response.status === 204) {
    return null
  }

  let data = null
  try {
    data = await response.json()
  } catch (error) {
    data = null
  }

  if (!response.ok) {
    const message = data && data.error ? data.error : 'Une erreur est survenue.'
    const error = new Error(message)
    error.status = response.status
    error.body = data
    error.path = path
    throw error
  }

  return data
}

export async function registerUser(payload) {
  if (isSupabaseEnabled) {
    const { data, error } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: { name: payload.name || '' }
      }
    })
    if (error) {
      throw new Error(error.message)
    }
    const user = data.user ? { id: data.user.id, email: data.user.email, name: data.user.user_metadata?.name || '' } : null
    return user
  }
  const data = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
  return data.user
}

export async function loginUser(payload) {
  console.log('Debug login - isSupabaseEnabled:', isSupabaseEnabled)
  if (isSupabaseEnabled) {
    console.log('Utilisation de Supabase pour l\'auth')
    const { data, error } = await supabase.auth.signInWithPassword({
      email: payload.email,
      password: payload.password
    })
    if (error) {
      throw new Error(error.message)
    }
    const user = data.user ? { id: data.user.id, email: data.user.email, name: data.user.user_metadata?.name || '' } : null
    return user
  }
  console.log('Utilisation de l\'API Render pour l\'auth')
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
  return data.user
}

export async function fetchState() {
  if (isSupabaseEnabled) {
    // Charger catégories et cartes pour l'utilisateur courant
    const session = await supabase.auth.getSession()
    const userId = session?.data?.session?.user?.id
    if (!userId) {
      return { user: null, cards: [], categories: [] }
    }

    const [{ data: categories, error: catErr }, { data: cards, error: cardErr }] = await Promise.all([
      supabase.from('categories').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
      supabase.from('cards').select('*').eq('user_id', userId).order('created_at', { ascending: true })
    ])
    if (catErr) throw new Error(catErr.message)
    if (cardErr) throw new Error(cardErr.message)

    const normalizedCategories = (categories || []).map((c) => ({
      id: c.id,
      name: c.name,
      parentId: c.parent_id,
      color: c.color || 'blue',
      createdAt: c.created_at,
      updatedAt: c.updated_at
    }))
    const normalizedCards = (cards || []).map((r) => ({
      id: r.id,
      question: r.question,
      answer: r.answer,
      categoryId: r.category_id,
      masteryStatus: r.mastery_status || 'unknown',
      imageUrl: r.image_url,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }))

    const currentUser = session?.data?.session?.user
    return {
      user: currentUser ? { id: currentUser.id, email: currentUser.email, name: currentUser.user_metadata?.name || '' } : null,
      cards: normalizedCards,
      categories: normalizedCategories
    }
  }
  return request('/state', { method: 'GET' })
}

export async function createCard(payload) {
  if (isSupabaseEnabled) {
    const session = await supabase.auth.getSession()
    const userId = session?.data?.session?.user?.id
    if (!userId) throw new Error('Non authentifié')
    const { data, error } = await supabase.from('cards').insert({
      user_id: userId,
      question: payload.question,
      answer: payload.answer,
      category_id: payload.categoryId,
      mastery_status: payload.masteryStatus || 'unknown',
      image_url: payload.imageUrl || null
    }).select('*').single()
    if (error) throw new Error(error.message)
    return {
      id: data.id,
      question: data.question,
      answer: data.answer,
      categoryId: data.category_id,
      masteryStatus: data.mastery_status || 'unknown',
      imageUrl: data.image_url,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }
  }
  const data = await request('/cards', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
  return data.card
}

export async function updateCard(id, payload) {
  if (isSupabaseEnabled) {
    const updates = {
      question: payload.question,
      answer: payload.answer,
      category_id: payload.categoryId,
      mastery_status: payload.masteryStatus,
      image_url: payload.imageUrl
    }
    const { data, error } = await supabase.from('cards').update(updates).eq('id', id).select('*').single()
    if (error) throw new Error(error.message)
    return {
      id: data.id,
      question: data.question,
      answer: data.answer,
      categoryId: data.category_id,
      masteryStatus: data.mastery_status || 'unknown',
      imageUrl: data.image_url,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }
  }
  const data = await request(`/cards/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
  return data.card
}

export async function updateCardStatus(id, masteryStatus, snapshot) {
  try {
    if (isSupabaseEnabled) {
      const { data, error } = await supabase.from('cards').update({ mastery_status: masteryStatus }).eq('id', id).select('*').single()
      if (error) throw new Error(error.message)
      return {
        id: data.id,
        question: data.question,
        answer: data.answer,
        categoryId: data.category_id,
        masteryStatus: data.mastery_status || 'unknown',
        imageUrl: data.image_url,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }
    }
    const data = await request(`/cards/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ masteryStatus })
    })
    return data.card
  } catch (error) {
    const shouldFallback = error && (error.status === 404 || error.status === 405)

    if (!shouldFallback || !snapshot) {
      throw error
    }

    const { question, answer, categoryId } = snapshot

    if (!question || !answer || !categoryId) {
      throw error
    }

    const data = await updateCard(id, {
      question,
      answer,
      categoryId,
      masteryStatus
    })
    return data
  }
}

export async function deleteCard(id) {
  if (isSupabaseEnabled) {
    const { error } = await supabase.from('cards').delete().eq('id', id)
    if (error) throw new Error(error.message)
    return
  }
  await request(`/cards/${id}`, {
    method: 'DELETE'
  })
}

export async function createCategory(payload) {
  console.log('Debug Supabase config:', { isSupabaseEnabled, supabaseUrl: import.meta.env.VITE_SUPABASE_URL, supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Présent' : 'Manquant' })
  if (isSupabaseEnabled) {
    const session = await supabase.auth.getSession()
    const userId = session?.data?.session?.user?.id
    console.log('Debug Supabase session:', { session, userId })
    if (!userId) throw new Error('Non authentifié')
    const { data, error } = await supabase.from('categories').insert({
      user_id: userId,
      name: payload.name,
      parent_id: payload.parentId ?? null,
      color: payload.color || 'blue'
    }).select('*').single()
    if (error) throw new Error(error.message)
    return {
      id: data.id,
      name: data.name,
      parentId: data.parent_id,
      color: data.color || 'blue',
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }
  }
  const data = await request('/categories', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
  return data.category
}

export async function updateCategory(id, payload) {
  if (isSupabaseEnabled) {
    const updates = {
      name: payload.name,
      parent_id: payload.parentId ?? null,
      color: payload.color
    }
    const { data, error } = await supabase.from('categories').update(updates).eq('id', id).select('*').single()
    if (error) throw new Error(error.message)
    return {
      id: data.id,
      name: data.name,
      parentId: data.parent_id,
      color: data.color || 'blue',
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }
  }
  const data = await request(`/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
  return data.category
}

export async function deleteCategory(id) {
  if (isSupabaseEnabled) {
    // Supprimer d'abord les cartes associées (si foreign key on delete restrict)
    const { error: cardErr } = await supabase.from('cards').delete().eq('category_id', id)
    if (cardErr && cardErr.code !== 'PGRST204') {
      throw new Error(cardErr.message)
    }
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) throw new Error(error.message)
    return { ok: true }
  }
  const data = await request(`/categories/${id}`, {
    method: 'DELETE'
  })
  return data
}

export async function uploadCardImage(cardId, file) {
  if (!isSupabaseEnabled) {
    throw new Error('Upload d\'image non disponible en mode local')
  }

  const session = await supabase.auth.getSession()
  const userId = session?.data?.session?.user?.id
  if (!userId) throw new Error('Non authentifié')

  // Vérifier le type de fichier
  if (!file.type.startsWith('image/')) {
    throw new Error('Le fichier doit être une image')
  }

  // Vérifier la taille (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('L\'image ne doit pas dépasser 5MB')
  }

  // Générer un nom de fichier unique
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}/${cardId}-${Date.now()}.${fileExt}`
  
  try {
    // Upload vers Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('card-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      throw new Error(`Erreur d'upload: ${uploadError.message}`)
    }

    // Obtenir l'URL publique
    const { data: urlData } = supabase.storage
      .from('card-images')
      .getPublicUrl(fileName)

    return urlData.publicUrl
  } catch (error) {
    // Si le bucket n'existe pas, créer un message d'erreur plus clair
    if (error.message.includes('bucket') || error.message.includes('not found')) {
      throw new Error('Le stockage d\'images n\'est pas encore configuré. Veuillez contacter l\'administrateur.')
    }
    throw error
  }
}

export async function updateCardImage(cardId, imageUrl) {
  if (isSupabaseEnabled) {
    try {
      const { data, error } = await supabase.from('cards')
        .update({ image_url: imageUrl })
        .eq('id', cardId)
        .select('*')
        .single()
      
      if (error) {
        // Si la colonne n'existe pas, retourner une erreur claire
        if (error.message.includes('image_url') || error.message.includes('column')) {
          throw new Error('La colonne image_url n\'existe pas dans la base de données. Veuillez exécuter le script de migration.')
        }
        throw new Error(error.message)
      }
      
      return {
        id: data.id,
        question: data.question,
        answer: data.answer,
        categoryId: data.category_id,
        masteryStatus: data.mastery_status || 'unknown',
        imageUrl: data.image_url,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }
    } catch (error) {
      if (error.message.includes('image_url') || error.message.includes('column')) {
        throw new Error('La colonne image_url n\'existe pas dans la base de données. Veuillez exécuter le script de migration.')
      }
      throw error
    }
  }
  
  // Fallback pour l'API locale
  const data = await request(`/cards/${cardId}/image`, {
    method: 'PATCH',
    body: JSON.stringify({ imageUrl })
  })
  return data.card
}
