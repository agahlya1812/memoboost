const USER_NS = 'memoboost-user'
const STATE_NS = 'memoboost-state'

function getUserKey(userId) {
  const id = String(userId || '').trim()
  return id ? `${STATE_NS}:${id}` : STATE_NS
}

export function readUserFromLocal() {
  try {
    const raw = window.localStorage.getItem(USER_NS)
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw)
    if (parsed && parsed.id) {
      return parsed
    }
  } catch (error) {
    // ignore
  }
  return null
}

export function writeUserToLocal(user) {
  try {
    if (user && user.id) {
      window.localStorage.setItem(USER_NS, JSON.stringify(user))
    }
  } catch (error) {
    // ignore
  }
}

export function readStateFromLocal(userId) {
  try {
    const key = getUserKey(userId)
    const raw = window.localStorage.getItem(key)
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw)
    if (parsed && Array.isArray(parsed.categories) && Array.isArray(parsed.cards)) {
      return parsed
    }
  } catch (error) {
    // ignore
  }
  return null
}

export function writeStateToLocal(userId, state) {
  try {
    const key = getUserKey(userId)
    const safe = {
      categories: Array.isArray(state?.categories) ? state.categories : [],
      cards: Array.isArray(state?.cards) ? state.cards : []
    }
    window.localStorage.setItem(key, JSON.stringify(safe))
  } catch (error) {
    // ignore
  }
}

export function removeStateFromLocal(userId) {
  try {
    const key = getUserKey(userId)
    window.localStorage.removeItem(key)
  } catch (error) {
    // ignore
  }
}

export function mergeServerAndLocal(serverState, localState) {
  // Stratégie simple: si serveur est vide mais local a des données, retourner local
  // Sinon, préférer serveur.
  const hasServer = Array.isArray(serverState?.categories) && serverState.categories.length > 0 || Array.isArray(serverState?.cards) && serverState.cards.length > 0
  if (!hasServer && localState) {
    return { ...serverState, ...localState }
  }
  return serverState
}





