import { useState, useEffect, useCallback } from 'react'
import { Wifi, Activity, AlertTriangle, CheckCircle, Clock, WifiOff, RefreshCw } from 'lucide-react'
import { getSpaces } from '../services/api'
import { useSocket } from '../hooks/useSocket'
import { THRESHOLDS } from '../data/mockData'

const STATUS_CFG = {
  good:     { label: 'Bon',       border: 'border-green-200',  bg: 'bg-green-50',  badge: 'bg-green-100 text-green-700',   icon: CheckCircle,   iconColor: '#10B981' },
  moderate: { label: 'Modere',    border: 'border-yellow-200', bg: 'bg-yellow-50', badge: 'bg-yellow-100 text-yellow-700', icon: Activity,      iconColor: '#F59E0B' },
  warning:  { label: 'Attention', border: 'border-orange-200', bg: 'bg-orange-50', badge: 'bg-orange-100 text-orange-700', icon: AlertTriangle, iconColor: '#F97316' },
  critical: { label: 'Critique',  border: 'border-red-200',    bg: 'bg-red-50',    badge: 'bg-red-100 text-red-700',       icon: AlertTriangle, iconColor: '#EF4444' },
}
const SENSORS = ['MQ-2', 'MQ-7', 'MQ-135', 'DHT22']

function deriveStatus(s) {
  const co  = s.co || s.co_corrected  || 0
  const gaz = s.gaz_inflammable || s.gaz_corrected || 0
  const cov = s.cov || s.cov_corrected || 0
  if (co > THRESHOLDS.co.danger || gaz > THRESHOLDS.gaz_inflammable.danger || cov > THRESHOLDS.cov.danger) return 'critical'
  if (co > THRESHOLDS.co.warning || gaz > THRESHOLDS.gaz_inflammable.warning || cov > THRESHOLDS.cov.warning) return 'warning'
  return 'good'
}

function timeAgo(iso) {
  if (!iso) return '--'
  const diff = (Date.now() - new Date(iso)) / 1000
  if (diff < 60) return "A l'instant"
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`
  return `Il y a ${Math.floor(diff / 3600)}h`
}

export default function MapPage() {
  const [spaces,  setSpaces]  = useState([])
  const [selected,setSelected]= useState(null)
  const [filter,  setFilter]  = useState('Tous')
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const loadSpaces = useCallback(async () => {
    try {
      setError(null)
      const res = await getSpaces()
      const enriched = (res.data || []).map(s => ({
        ...s,
        co:              s.co  ?? s.co_corrected  ?? 0,
        gaz_inflammable: s.gaz_inflammable ?? s.gaz_corrected ?? 0,
        cov:             s.cov ?? s.cov_corrected ?? 0,
        status:          deriveStatus(s),
        lastUpdate:      s.last_update || s.created_at,
        sensors:         SENSORS,
        icon:            s.icon || '🏢',
      }))
      setSpaces(enriched)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadSpaces() }, [loadSpaces])

  useSocket('new_reading', (r) => {
    setSpaces(prev => prev.map(s => {
      if (s.id !== r.space_id) return s
      const u = { ...s, co: r.co_corrected, gaz_inflammable: r.gaz_corrected, cov: r.cov_corrected, temperature: r.temperature, humidity: r.humidity, lastUpdate: r.created_at }
      u.status = deriveStatus(u)
      return u
    }))
  })

  const filters  = ['Tous', 'Critique', 'Attention', 'Bon']
  const filtered = spaces.filter(s => {
    if (filter === 'Tous')      return true
    if (filter === 'Critique')  return s.status === 'critical'
    if (filter === 'Attention') return s.status === 'warning' || s.status === 'moderate'
    if (filter === 'Bon')       return s.status === 'good'
    return true
  })
  const sel = selected ? spaces.find(s => s.id === selected) : null

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-[#065A82] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Chargement des espaces...</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-sm">
        <WifiOff size={40} className="mx-auto mb-3 text-red-400" />
        <p className="font-semibold text-gray-700 mb-1">Erreur de connexion</p>
        <p className="text-gray-400 text-sm mb-4">{error}</p>
        <button onClick={loadSpaces} className="px-4 py-2 bg-[#065A82] text-white rounded-xl text-sm">Reessayer</button>
      </div>
    </div>
  )

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Espaces surveilles</h1>
          <p className="text-gray-500 text-sm mt-0.5">{spaces.length} espaces - {spaces.filter(s => s.status === 'critical').length} critiques</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {filters.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${filter === f ? 'bg-[#065A82] text-white shadow' : 'bg-white text-gray-600 border border-gray-200'}`}>
              {f}
            </button>
          ))}
          <button onClick={loadSpaces} className="p-1.5 text-gray-400 hover:text-gray-600"><RefreshCw size={15} /></button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Espaces actifs', val: spaces.length,                                                                color: 'text-[#065A82]',  bg: 'bg-blue-50',   border: 'border-blue-100'   },
          { label: 'Critiques',      val: spaces.filter(s => s.status === 'critical').length,                          color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-100'    },
          { label: 'En attention',   val: spaces.filter(s => s.status === 'warning' || s.status === 'moderate').length, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-100' },
          { label: 'Air sain',       val: spaces.filter(s => s.status === 'good').length,                              color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-100'  },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border p-4 ${s.bg} ${s.border}`}>
            <p className={`text-3xl font-black ${s.color}`}>{s.val}</p>
            <p className={`text-sm font-medium mt-0.5 ${s.color}`}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-5">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 content-start">
          {filtered.length === 0 && <p className="text-gray-400 text-sm col-span-3 text-center py-10">Aucun espace</p>}
          {filtered.map(space => {
            const cfg = STATUS_CFG[space.status] || STATUS_CFG.moderate
            const isSelected = selected === space.id
            return (
              <button key={space.id} onClick={() => setSelected(isSelected ? null : space.id)}
                className={`text-left rounded-2xl border-2 p-4 transition-all hover:shadow-md ${isSelected ? 'border-[#065A82] bg-blue-50 shadow-md' : `${cfg.border} bg-white`}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{space.icon}</span>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{space.name}</p>
                      <p className="text-gray-400 text-xs">{space.type}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cfg.badge}`}>{cfg.label}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[
                    { label: 'CO',  val: space.co,              danger: (space.co || 0) > THRESHOLDS.co.danger },
                    { label: 'Gaz', val: space.gaz_inflammable, danger: (space.gaz_inflammable || 0) > THRESHOLDS.gaz_inflammable.danger },
                    { label: 'COV', val: space.cov,             danger: (space.cov || 0) > THRESHOLDS.cov.danger },
                  ].map(r => (
                    <div key={r.label} className={`rounded-lg px-2 py-1.5 text-center ${r.danger ? 'bg-red-50' : 'bg-gray-50'}`}>
                      <p className="text-gray-400">{r.label}</p>
                      <p className={`font-bold ${r.danger ? 'text-red-600' : 'text-gray-700'}`}>{r.val ?? '--'}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><Wifi size={11} />{SENSORS.length} capteurs</span>
                  <span className="flex items-center gap-1"><Clock size={11} />{timeAgo(space.lastUpdate)}</span>
                </div>
              </button>
            )
          })}
        </div>

        {sel && (
          <div className="w-72 shrink-0 space-y-4">
            <div className="bg-[#0A1628] rounded-2xl p-4 text-white">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-3xl">{sel.icon}</span>
                  <p className="font-bold text-base mt-1">{sel.name}</p>
                  <p className="text-[#7FB3C8] text-xs">{sel.type}</p>
                </div>
                <button onClick={() => setSelected(null)} className="text-[#7FB3C8] hover:text-white text-xl leading-none">x</button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <h3 className="font-semibold text-gray-800 text-sm mb-3">Mesures capteurs</h3>
              <div className="space-y-3">
                {[
                  { label: 'CO (MQ-7)',              val: sel.co,              unit: 'ppm', over: (sel.co || 0) > THRESHOLDS.co.danger,             warn: (sel.co || 0) > THRESHOLDS.co.warning },
                  { label: 'Gaz inflammable (MQ-2)', val: sel.gaz_inflammable, unit: 'ppm', over: (sel.gaz_inflammable || 0) > THRESHOLDS.gaz_inflammable.danger, warn: (sel.gaz_inflammable || 0) > THRESHOLDS.gaz_inflammable.warning },
                  { label: 'COV (MQ-135)',           val: sel.cov,             unit: 'ppm', over: (sel.cov || 0) > THRESHOLDS.cov.danger,            warn: (sel.cov || 0) > THRESHOLDS.cov.warning },
                  { label: 'Temperature (DHT22)',    val: sel.temperature,     unit: 'C',   over: (sel.temperature || 0) > THRESHOLDS.temperature.danger, warn: false },
                  { label: 'Humidite (DHT22)',       val: sel.humidity,        unit: '%',   over: (sel.humidity || 0) > THRESHOLDS.humidity.danger,    warn: false },
                ].map(r => (
                  <div key={r.label} className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">{r.label}</span>
                    <span className={`text-sm font-bold ${r.over ? 'text-red-600' : r.warn ? 'text-yellow-600' : 'text-green-600'}`}>
                      {r.val ?? '--'} {r.val != null ? r.unit : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <h3 className="font-semibold text-gray-800 text-sm mb-2">Capteurs actifs</h3>
              <div className="flex flex-wrap gap-2">
                {SENSORS.map(s => (
                  <span key={s} className="text-xs bg-[#E8F4FD] text-[#065A82] font-semibold px-2.5 py-1 rounded-lg">{s}</span>
                ))}
              </div>
            </div>
            <div className="text-xs text-gray-400 text-center">Mise a jour: {timeAgo(sel.lastUpdate)}</div>
          </div>
        )}
      </div>
    </div>
  )
}
