/**
 * Couche API — toutes les requêtes vers le backend AirWatch
 * Base URL : http://localhost:3001
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const data = await res.json()
  if (!res.ok || !data.success) {
    throw new Error(data.error || `Erreur HTTP ${res.status}`)
  }
  return data
}

// ── Readings ──────────────────────────────────────────────────

/** Dernière mesure de chaque espace */
export const getLatestReadings = () =>
  request('/api/readings/latest')

/** Historique 24h pour un espace */
export const getHistory = (spaceId = 1, hours = 24) =>
  request(`/api/readings/history?space_id=${spaceId}&hours=${hours}`)

/** Tout le contenu de la base (sans limite) */
export const getAllReadings = () =>
  request('/api/readings/all')

// ── Alertes ───────────────────────────────────────────────────

/** Liste des alertes (filtres optionnels) */
export const getAlerts = (params = {}) => {
  const qs = new URLSearchParams(params).toString()
  return request(`/api/alerts${qs ? '?' + qs : ''}`)
}

/** Comptes par sévérité */
export const getAlertStats = () =>
  request('/api/alerts/stats')

/** Marquer une alerte comme lue */
export const acknowledgeAlert = (id) =>
  request(`/api/alerts/${id}/acknowledge`, { method: 'PATCH' })

/** Marquer toutes les alertes comme lues */
export const acknowledgeAll = () =>
  request('/api/alerts/acknowledge-all', { method: 'PATCH' })

/** Supprimer une alerte */
export const deleteAlert = (id) =>
  request(`/api/alerts/${id}`, { method: 'DELETE' })

// ── Espaces ───────────────────────────────────────────────────

/** Liste des espaces avec leur dernière mesure */
export const getSpaces = () =>
  request('/api/spaces')

/** Détail d'un espace + historique 24h */
export const getSpace = (id) =>
  request(`/api/spaces/${id}`)

// ── Santé ─────────────────────────────────────────────────────

export const getHealth = () =>
  request('/api/health')
