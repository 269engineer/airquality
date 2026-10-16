import { useEffect, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

let sharedSocket = null

function getSocket() {
  if (!sharedSocket) {
    sharedSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    })
    sharedSocket.on('connect',    () => console.log('🔌 Socket.IO connecté'))
    sharedSocket.on('disconnect', () => console.log('🔌 Socket.IO déconnecté'))
    sharedSocket.on('connect_error', (e) => console.warn('⚠️ Socket.IO erreur:', e.message))
  }
  return sharedSocket
}

/**
 * Hook pour écouter les événements Socket.IO.
 *
 * Événements backend :
 *   'new_reading' → { id, space_id, co_corrected, gaz_corrected, cov_corrected,
 *                     temperature, humidity, qai_score, created_at, ... }
 *   'new_alert'   → { id, space_id, severity, sensor, pollutant, value, unit,
 *                     title, message, telegram_sent, created_at }
 *
 * @param {string}   event    - nom de l'événement
 * @param {Function} callback - appelé à chaque réception
 */
export function useSocket(event, callback) {
  const cbRef = useRef(callback)
  cbRef.current = callback

  useEffect(() => {
    const socket = getSocket()
    const handler = (...args) => cbRef.current(...args)
    socket.on(event, handler)
    return () => socket.off(event, handler)
  }, [event])
}

/**
 * Hook retournant le statut de connexion Socket.IO.
 * Utile pour afficher un indicateur "Live" dans l'UI.
 */
export function useSocketStatus() {
  const socket = getSocket()
  return socket.connected
}
