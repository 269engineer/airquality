import { useState, useEffect, useRef } from 'react'
import { AlertTriangle, CheckCircle, Info, X, Check, Bell, Send, WifiOff, RefreshCw } from 'lucide-react'
import { getAlerts, getAlertStats, acknowledgeAlert, acknowledgeAll, deleteAlert } from '../services/api'

const REFRESH_MS = 5000

const SEV = {
  critical: { label: 'Critique',    bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700',    badge: 'bg-red-100 text-red-700',    icon: AlertTriangle, color: '#EF4444' },
  warning:  { label: 'Attention',   bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-700', icon: AlertTriangle, color: '#F59E0B' },
  info:     { label: 'Information', bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   badge: 'bg-blue-100 text-blue-700',   icon: Info,          color: '#065A82' },
}

const FILTERS = ['Toutes', 'Critique', 'Attention', 'Information', 'Non lues']

function timeAgo(iso) {
  if (!iso) return '--'
  const s = (Date.now() - new Date(iso)) / 1000
  if (s < 60)    return "A l'instant"
  if (s < 3600)  return `Il y a ${Math.floor(s / 60)} min`
  if (s < 86400) return `Il y a ${Math.floor(s / 3600)}h`
  return `Il y a ${Math.floor(s / 86400)}j`
}

export default function AlertsPage() {
  const [alertList, setAlertList] = useState([])
  const [stats,     setStats]     = useState({ critical: 0, warning: 0, info: 0, unread: 0, total: 0 })
  const [filter,    setFilter]    = useState('Toutes')
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [lastUpdate,setLastUpdate]= useState(null)
  const [tick,      setTick]      = useState(0)
  const busy = useRef(false)

  useEffect(() => {
    let alive = true

    async function fetchAll() {
      if (busy.current) return
      busy.current = true
      try {
        const [aRes, sRes] = await Promise.all([
          getAlerts({ limit: 100 }),
          getAlertStats(),
        ])
        if (!alive) return
        setAlertList(aRes.data || [])
        setStats(sRes.data   || { critical: 0, warning: 0, info: 0, unread: 0, total: 0 })
        setLastUpdate(new Date())
        setTick(t => t + 1)
        setError(null)
      } catch (err) {
        if (alive && loading) setError(err.message)
      } finally {
        if (alive) setLoading(false)
        busy.current = false
      }
    }

    fetchAll()
    const id = setInterval(fetchAll, REFRESH_MS)
    return () => { alive = false; clearInterval(id) }
  }, [])

  const handleAcknowledge = async (id) => {
    try {
      await acknowledgeAlert(id)
      setAlertList(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a))
      setStats(prev => ({ ...prev, unread: Math.max(0, (prev.unread || 1) - 1) }))
    } catch (e) { console.error(e) }
  }

  const handleAcknowledgeAll = async () => {
    try {
      await acknowledgeAll()
      setAlertList(prev => prev.map(a => ({ ...a, acknowledged: true })))
      setStats(prev => ({ ...prev, unread: 0 }))
    } catch (e) { console.error(e) }
  }

  const handleDelete = async (id) => {
    try {
      await deleteAlert(id)
      setAlertList(prev => prev.filter(a => a.id !== id))
      setStats(prev => ({ ...prev, total: Math.max(0, (prev.total || 1) - 1) }))
    } catch (e) { console.error(e) }
  }

  const filtered = alertList.filter(a => {
    if (filter === 'Toutes')      return true
    if (filter === 'Non lues')    return !a.acknowledged
    if (filter === 'Critique')    return a.severity === 'critical'
    if (filter === 'Attention')   return a.severity === 'warning'
    if (filter === 'Information') return a.severity === 'info'
    return true
  })

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-[#065A82] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Chargement des alertes...</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-sm">
        <WifiOff size={40} className="mx-auto mb-3 text-red-400" />
        <p className="font-semibold text-gray-700 mb-1">Erreur de connexion</p>
        <p className="text-gray-400 text-sm mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-[#065A82] text-white rounded-xl text-sm">Reessayer</button>
      </div>
    </div>
  )

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alertes</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {stats.total || alertList.length} alertes — {stats.unread || 0} non lues
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <RefreshCw size={11} /> #{tick} — {lastUpdate ? lastUpdate.toLocaleTimeString('fr-FR') : '...'}
          </span>
          {(stats.unread || 0) > 0 && (
            <button onClick={handleAcknowledgeAll}
              className="flex items-center gap-1.5 text-sm text-[#065A82] font-medium hover:underline">
              <CheckCircle size={15} /> Tout marquer lu
            </button>
          )}
        </div>
      </div>

      {/* Compteurs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Critiques',    count: stats.critical || 0, bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700'    },
          { label: 'Attentions',   count: stats.warning  || 0, bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700' },
          { label: 'Informations', count: stats.info     || 0, bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700'   },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border p-4 ${s.bg} ${s.border}`}>
            <p className={`text-4xl font-black ${s.text}`}>{s.count}</p>
            <p className={`text-sm font-medium mt-1 ${s.text}`}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all
              ${filter === f ? 'bg-[#065A82] text-white shadow' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'}`}>
            {f}
            {f === 'Non lues' && (stats.unread || 0) > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{stats.unread}</span>
            )}
          </button>
        ))}
      </div>

      {/* Liste */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Bell size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">Aucune alerte dans cette categorie</p>
            <p className="text-sm mt-1">Les alertes apparaissent automatiquement quand un seuil est depasse</p>
          </div>
        )}

        {filtered.map(alert => {
          const cfg  = SEV[alert.severity] || SEV.info
          const Icon = cfg.icon
          return (
            <div key={alert.id}
              className={`rounded-2xl border p-4 transition-all ${cfg.bg} ${cfg.border} ${alert.acknowledged ? 'opacity-55' : ''}`}>
              <div className="flex items-start gap-3">
                <div className="shrink-0 mt-0.5">
                  <Icon size={20} color={cfg.color} />
                </div>
                <div className="flex-1 min-w-0">
                  {/* Titre + badge + point non-lu */}
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className={`font-semibold text-base leading-tight ${cfg.text}`}>{alert.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}>{cfg.label}</span>
                    {!alert.acknowledged && (
                      <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" title="Non lue" />
                    )}
                  </div>

                  {/* Message */}
                  <p className="text-gray-600 text-sm leading-relaxed">{alert.message}</p>

                  {/* Meta */}
                  <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                      <span>🔬 {alert.sensor} — {alert.pollutant}: <strong>{alert.value} {alert.unit}</strong></span>
                      <span>📏 Seuil: {alert.threshold_val} {alert.unit}</span>
                      <span>🕐 {timeAgo(alert.created_at)}</span>
                      {alert.telegram_sent
                        ? <span className="flex items-center gap-1 text-[#02C39A] font-semibold"><Send size={11} /> Telegram envoye</span>
                        : <span className="flex items-center gap-1 text-gray-400"><Send size={11} /> Non envoye</span>
                      }
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {!alert.acknowledged && (
                        <button onClick={() => handleAcknowledge(alert.id)}
                          className="flex items-center gap-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 hover:border-[#065A82] px-2.5 py-1 rounded-lg transition-colors">
                          <Check size={12} /> Marquer lu
                        </button>
                      )}
                      <button onClick={() => handleDelete(alert.id)}
                        className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-red-600 bg-white border border-gray-200 hover:border-red-300 px-2.5 py-1 rounded-lg transition-colors">
                        <X size={12} /> Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
