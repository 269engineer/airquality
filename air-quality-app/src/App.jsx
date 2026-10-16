import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useCallback } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import MapPage from './pages/MapPage'
import HistoryPage from './pages/HistoryPage'
import { ToastContainer } from './components/NotificationToast'
import { useNotifications } from './hooks/useNotifications'
import { useSocket } from './hooks/useSocket'

function AppInner() {
  const { toasts, push, remove } = useNotifications()

  useSocket('new_alert', useCallback((alert) => {
    push(alert)
  }, [push]))

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/"         element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/map"       element={<MapPage />} />
          <Route path="/history"   element={<HistoryPage />} />
        </Routes>
      </main>
      <ToastContainer toasts={toasts} onClose={remove} />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  )
}
