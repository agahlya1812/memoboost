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
  const data = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
  return data.user
}

export async function loginUser(payload) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
  return data.user
}

export async function fetchState() {
  return request('/state', { method: 'GET' })
}

export async function createCard(payload) {
  const data = await request('/cards', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
  return data.card
}

export async function updateCard(id, payload) {
  const data = await request(`/cards/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
  return data.card
}

export async function updateCardStatus(id, masteryStatus, snapshot) {
  try {
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
  await request(`/cards/${id}`, {
    method: 'DELETE'
  })
}

export async function createCategory(payload) {
  const data = await request('/categories', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
  return data.category
}

export async function updateCategory(id, payload) {
  const data = await request(`/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
  return data.category
}

export async function deleteCategory(id) {
  const data = await request(`/categories/${id}`, {
    method: 'DELETE'
  })
  return data
}
