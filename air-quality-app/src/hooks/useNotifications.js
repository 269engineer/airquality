import { useState, useCallback } from 'react'

let _nextId = 1

export function useNotifications() {
  const [toasts, setToasts] = useState([])

  const push = useCallback((alert) => {
    const id = _nextId++
    setToasts(prev => [...prev.slice(-4), { ...alert, id }])  // max 5 visibles
  }, [])

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return { toasts, push, remove }
}
