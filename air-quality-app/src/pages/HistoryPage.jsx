import { useState, useEffect, useRef } from 'react'
import { Download, RefreshCw, WifiOff, Clock, Filter } from 'lucide-react'
import { getHistory, getAllReadings } from '../services/api'

const REFRESH_MS = 5000
const HOUR_OPTIONS = [1, 6, 12, 24, 48, 72]

function fmtDate(iso) {
  if (!iso) return '--'
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function f2(v) { return v != null ? parseFloat(Number(v).toFixed(2)) : '--' }

function downloadCSV(rows, hours) {
  const header = 'Date/Heure,MQ-7 CO (ppm corrige),MQ-2 Gaz (ppm corrige),MQ-135 COV (ppm corrige),Temperature (C),Humidite (%)'
  const lines = rows.map(r =>
    [
      fmtDate(r.created_at),
      r.co_corrected  ?? '',
      r.gaz_corrected ?? '',
      r.cov_corrected ?? '',
      r.temperature ?? '',
      r.humidity    ?? '',
    ].join(',')
  )
  const csv  = [header, ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `airwatch_historique_${hours}h_${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function HistoryPage() {
  const [rows,       setRows]       = useState([])
  const [hours,      setHours]      = useState(24)
  const [showAll,    setShowAll]    = useState(false)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [tick,       setTick]       = useState(0)
  const busy = useRef(false)

  useEffect(() => {
    let alive = true
    async function fetch_() {
      if (busy.current) return
      busy.current = true
      try {
        const res = showAll ? await getAllReadings() : await getHistory(1, hours)
        if (!alive) return
        // history renvoie ASC -> inverser ; all renvoie deja DESC
        setRows(showAll ? (res.data || []) : [...(res.data || [])].reverse())
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
    fetch_()
    const id = setInterval(fetch_, REFRESH_MS)
    return () => { alive = false; clearInterval(id) }
  }, [hours, showAll])

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-[#065A82] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Chargement de l historique...</p>
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
    <div className="p-6 space-y-5 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Historique des capteurs</h1>
          <p className="text-gray-500 text-sm mt-0.5">{rows.length} mesures — rafraichi toutes les 5s</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <RefreshCw size={11} /> #{tick} — {lastUpdate ? lastUpdate.toLocaleTimeString('fr-FR') : '...'}
          </span>
          <button
            onClick={() => downloadCSV(rows, hours)}
            disabled={rows.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-[#02C39A] text-white rounded-xl text-sm font-semibold hover:bg-[#01a884] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <Download size={15} /> Telecharger CSV
          </button>
        </div>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Mesures',   val: rows.length,                                                                                     color: 'text-[#065A82]',  bg: 'bg-blue-50',   border: 'border-blue-100'   },
          { label: 'Temp moy.', val: rows.length ? (rows.reduce((s,r) => s + (r.temperature||0), 0) / rows.length).toFixed(1) + ' C' : '--', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
          { label: 'Hum. moy.', val: rows.length ? (rows.reduce((s,r) => s + (r.humidity||0),    0) / rows.length).toFixed(1) + ' %' : '--', color: 'text-blue-500',   bg: 'bg-sky-50',    border: 'border-sky-100'    },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border p-4 ${s.bg} ${s.border}`}>
            <p className={`text-2xl font-black ${s.color}`}>{s.val}</p>
            <p className={`text-sm font-medium mt-0.5 ${s.color}`}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filtres periode */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="flex items-center gap-1.5 text-sm text-gray-500 font-medium">
          <Filter size={14} /> Periode :
        </span>
        {HOUR_OPTIONS.map(h => (
          <button key={h} onClick={() => { setLoading(true); setShowAll(false); setHours(h) }}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all
              ${!showAll && hours === h ? 'bg-[#065A82] text-white shadow' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'}`}>
            {h < 24 ? `${h}h` : `${h/24}j`}
          </button>
        ))}
        <button onClick={() => { setLoading(true); setShowAll(true) }}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all
            ${showAll ? 'bg-[#065A82] text-white shadow' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'}`}>
          Tout afficher
        </button>
      </div>

      {/* Tableau */}
      {rows.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Clock size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Aucune donnee pour cette periode</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#0A1628] text-[#7FB3C8] text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 text-left font-semibold">Date / Heure</th>
                  <th className="px-4 py-3 text-right font-semibold">MQ-7 corr.</th>
                  <th className="px-4 py-3 text-right font-semibold">MQ-2 corr.</th>
                  <th className="px-4 py-3 text-right font-semibold">MQ-135 corr.</th>
                  <th className="px-4 py-3 text-right font-semibold">Temp (C)</th>
                  <th className="px-4 py-3 text-right font-semibold">Hum (%)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const over_co  = (r.co_corrected  || 0) >= 1500
                  const over_gaz = (r.gaz_corrected || 0) >= 1100
                  const over_cov = (r.cov_corrected || 0) >= 1100
                  const warn_co  = !over_co  && (r.co_corrected  || 0) >= 750
                  const warn_gaz = !over_gaz && (r.gaz_corrected || 0) >= 550
                  const warn_cov = !over_cov && (r.cov_corrected || 0) >= 550
                  return (
                    <tr key={r.id || i}
                      className={`border-t border-gray-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/30`}>
                      <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap font-mono text-xs">{fmtDate(r.created_at)}</td>
                      <td className={`px-4 py-2.5 text-right font-semibold tabular-nums ${over_co ? 'text-red-600' : warn_co ? 'text-yellow-600' : 'text-gray-700'}`}>{f2(r.co_corrected)}</td>
                      <td className={`px-4 py-2.5 text-right font-semibold tabular-nums ${over_gaz ? 'text-red-600' : warn_gaz ? 'text-yellow-600' : 'text-gray-700'}`}>{f2(r.gaz_corrected)}</td>
                      <td className={`px-4 py-2.5 text-right font-semibold tabular-nums ${over_cov ? 'text-red-600' : warn_cov ? 'text-yellow-600' : 'text-gray-700'}`}>{f2(r.cov_corrected)}</td>
                      <td className="px-4 py-2.5 text-right text-orange-600 font-medium tabular-nums">{f2(r.temperature)}</td>
                      <td className="px-4 py-2.5 text-right text-blue-500 font-medium tabular-nums">{f2(r.humidity)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
