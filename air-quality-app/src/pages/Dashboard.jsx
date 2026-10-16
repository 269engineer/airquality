import { useState, useEffect, useRef } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { RefreshCw, Thermometer, Droplets, AlertTriangle, Wifi, WifiOff, Info, CheckCircle, Wind, Flame } from 'lucide-react'
import StatCard from '../components/StatCard'
import { getLatestReadings, getHistory } from '../services/api'
import { THRESHOLDS } from '../data/mockData'

const REFRESH_MS = 5000

// ── Configuration des conseils par capteur et par plage de seuil ──────────────
const CONSEILS_CONFIG = [
  // CO (MQ-7)
  {
    key: 'co_danger', level: 'danger', Icon: AlertTriangle,
    title: 'CO dangereux',
    message: 'Evacuez l\'espace immediatement et ouvrez toutes les ouvertures. Le taux de monoxyde de carbone est dangereux pour la sante.',
    check: (co) => co > THRESHOLDS.co.danger,
  },
  {
    key: 'co_warning', level: 'warning', Icon: Wind,
    title: 'CO en hausse',
    message: 'Pensez a ouvrir les fenetres et a aerer l\'espace. Le taux de CO commence a monter.',
    check: (co) => co > THRESHOLDS.co.warning && co <= THRESHOLDS.co.danger,
  },
  // Gaz inflammable (MQ-2)
  {
    key: 'gaz_danger', level: 'danger', Icon: Flame,
    title: 'Gaz inflammable detecte',
    message: 'Coupez les appareils a gaz, evacuez l\'espace et contactez les secours. Ne declenchez aucune etincelle.',
    check: (_, gaz) => gaz > THRESHOLDS.gaz_inflammable.danger,
  },
  {
    key: 'gaz_warning', level: 'warning', Icon: Flame,
    title: 'Presence de gaz inhabituelle',
    message: 'Verifiez les appareils a gaz, ouvrez les fenetres et aérez bien l\'espace.',
    check: (_, gaz) => gaz > THRESHOLDS.gaz_inflammable.warning && gaz <= THRESHOLDS.gaz_inflammable.danger,
  },
  // COV (MQ-135)
  {
    key: 'cov_danger', level: 'danger', Icon: AlertTriangle,
    title: 'COV critiques',
    message: 'Taux de composes organiques volatils dangereux. Evacuez et aérez immediatement. Evitez tout produit chimique.',
    check: (_, __, cov) => cov > THRESHOLDS.cov.danger,
  },
  {
    key: 'cov_warning', level: 'warning', Icon: Wind,
    title: 'COV eleves',
    message: 'Aérez l\'espace et limitez l\'utilisation de peintures, solvants ou produits d\'entretien.',
    check: (_, __, cov) => cov > THRESHOLDS.cov.warning && cov <= THRESHOLDS.cov.danger,
  },
  // Temperature (DHT22)
  {
    key: 'temp_danger', level: 'danger', Icon: Thermometer,
    title: 'Temperature critique',
    message: 'Temperature dangereusement elevee. Activez la climatisation immediatement et limitez les activites physiques.',
    check: (_, __, ___, temp) => temp > THRESHOLDS.temperature.danger,
  },
  {
    key: 'temp_warning', level: 'warning', Icon: Thermometer,
    title: 'Temperature elevee',
    message: 'Pensez a activer la ventilation ou la climatisation pour maintenir un confort thermique.',
    check: (_, __, ___, temp) => temp > THRESHOLDS.temperature.warning && temp <= THRESHOLDS.temperature.danger,
  },
  // Humidite (DHT22)
  {
    key: 'hum_danger', level: 'danger', Icon: Droplets,
    title: 'Humidite critique',
    message: 'Taux d\'humidite trop eleve, risque de moisissures. Activez la deshumidification et aérez l\'espace.',
    check: (_, __, ___, ____, hum) => hum > THRESHOLDS.humidity.danger,
  },
  {
    key: 'hum_warning', level: 'warning', Icon: Droplets,
    title: 'Humidite elevee',
    message: 'Activez la deshumidification ou ouvrez les fenetres pour faire baisser le taux d\'humidite.',
    check: (_, __, ___, ____, hum) => hum > THRESHOLDS.humidity.warning && hum <= THRESHOLDS.humidity.danger,
  },
]

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: <strong>{Number(p.value).toFixed(1)}</strong></p>
      ))}
    </div>
  )
}

const fmt = d => d ? new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--'
const f1  = v => parseFloat((v ?? 0).toFixed(1))

export default function Dashboard() {
  const [reading,    setReading]    = useState(null)
  const [history,    setHistory]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [tick,       setTick]       = useState(0)
  const spinning = useRef(false)

  useEffect(() => {
    let alive = true

    async function fetchAll() {
      if (spinning.current) return
      spinning.current = true
      try {
        const [rRes, hRes] = await Promise.all([
          getLatestReadings(),
          getHistory(1, 24),
        ])
        if (!alive) return
        setReading(rRes.data?.[0] || null)
        setHistory((hRes.data || []).map(r => ({
          time: fmt(r.created_at),
          co:   f1(r.co_corrected  ?? r.co),
          gaz:  f1(r.gaz_corrected ?? r.gaz),
          cov:  f1(r.cov_corrected ?? r.cov),
          temp: f1(r.temperature),
          hum:  f1(r.humidity),
        })))
        setLastUpdate(new Date())
        setTick(t => t + 1)
        setError(null)
      } catch (err) {
        if (alive && loading) setError(err.message)
      } finally {
        if (alive) setLoading(false)
        spinning.current = false
      }
    }

    fetchAll()
    const id = setInterval(fetchAll, REFRESH_MS)
    return () => { alive = false; clearInterval(id) }
  }, [])   // deps vides — un seul effet, un seul intervalle

  const co   = f1(reading?.co_corrected  ?? reading?.co)
  const gaz  = f1(reading?.gaz_corrected ?? reading?.gaz)
  const cov  = f1(reading?.cov_corrected ?? reading?.cov)
  const temp = f1(reading?.temperature)
  const hum  = f1(reading?.humidity)

  const status = co > THRESHOLDS.co.danger || gaz > THRESHOLDS.gaz_inflammable.danger || cov > THRESHOLDS.cov.danger
    ? { label: 'Danger',    bg: 'bg-red-100',    text: 'text-red-700'    }
    : co > THRESHOLDS.co.warning || gaz > THRESHOLDS.gaz_inflammable.warning || cov > THRESHOLDS.cov.warning
    ? { label: 'Attention', bg: 'bg-orange-100', text: 'text-orange-700' }
    : { label: 'Air sain',  bg: 'bg-green-100',  text: 'text-green-700'  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-[#065A82] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Chargement des donnees...</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-sm">
        <WifiOff size={40} className="mx-auto mb-3 text-red-400" />
        <p className="font-semibold text-gray-700 mb-1">Impossible de joindre le backend</p>
        <p className="text-gray-400 text-sm mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-[#065A82] text-white rounded-xl text-sm">Reessayer</button>
      </div>
    </div>
  )

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700">
            <Wifi size={12} /> Connecte
          </span>
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <RefreshCw size={11} /> Refresh #{tick} — {lastUpdate ? fmt(lastUpdate) : '...'}
          </span>
        </div>
      </div>

      {/* Hero statut */}
      <div className="bg-[#0A1628] rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6">
        <div className="flex-1">
          <p className="text-[#7FB3C8] text-sm font-medium">Statut global — Espace principal</p>
          <div className="mt-3">
            <span className={`inline-block px-5 py-2 rounded-xl font-bold text-lg ${status.bg} ${status.text}`}>
              {status.label}
            </span>
          </div>
        </div>
        <div className="flex gap-3 shrink-0">
          {[
            { icon: Thermometer, label: 'Temperature', val: `${temp} C`, color: 'text-orange-400' },
            { icon: Droplets,    label: 'Humidite',    val: `${hum} %`,  color: 'text-blue-400'   },
          ].map(({ icon: Icon, label, val, color }) => (
            <div key={label} className="bg-[#0D2137] rounded-xl p-3 text-center min-w-[110px]">
              <Icon size={18} className={`mx-auto mb-1 ${color}`} />
              <p className={`font-bold text-lg ${color}`}>{val}</p>
              <p className="text-[#7FB3C8] text-xs">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="CO"              value={co}   unit="ppm" color={co  > THRESHOLDS.co.danger             ? 'red' : co  > THRESHOLDS.co.warning             ? 'orange' : 'green'} />
        <StatCard label="Gaz inflammable" value={gaz}  unit="ppm" color={gaz > THRESHOLDS.gaz_inflammable.danger ? 'red' : gaz > THRESHOLDS.gaz_inflammable.warning ? 'orange' : 'green'} />
        <StatCard label="COV"             value={cov}  unit="ppm" color={cov > THRESHOLDS.cov.danger             ? 'red' : cov > THRESHOLDS.cov.warning             ? 'yellow' : 'green'} />
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Evolution des gaz — 24h (ppm)</h2>
            <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">{history.length} points</span>
          </div>
          {history.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">En attente de donnees...</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={history} margin={{ top: 5, right: 20, bottom: 0, left: 0 }}>
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                <Tooltip content={<Tip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="co"  name="CO"              stroke="#EF4444" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="gaz" name="Gaz inflammable" stroke="#F59E0B" strokeWidth={2}   dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="cov" name="COV"             stroke="#1C7293" strokeWidth={2}   dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-1">Temp & Humidite</h2>
          <p className="text-xs text-gray-400 mb-3">DHT22 — 24h</p>
          {history.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">En attente...</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={history} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                <Tooltip content={<Tip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="temp" name="Temp (C)" stroke="#F97316" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="hum"  name="Hum (%)"  stroke="#3B82F6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Barres + Alertes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Concentration vs seuils</h2>
          <div className="space-y-4">
            {[
              { label: 'CO',              val: co,  max: 150,  danger: THRESHOLDS.co.danger,             warning: THRESHOLDS.co.warning },
              { label: 'Gaz inflammable', val: gaz, max: 3000, danger: THRESHOLDS.gaz_inflammable.danger, warning: THRESHOLDS.gaz_inflammable.warning },
              { label: 'COV',             val: cov, max: 800,  danger: THRESHOLDS.cov.danger,            warning: THRESHOLDS.cov.warning },
            ].map(p => {
              const pct  = Math.min((p.val / p.max) * 100, 100)
              const over = p.val > p.danger
              const warn = !over && p.val > p.warning
              return (
                <div key={p.label}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-gray-700">{p.label}</span>
                    <span className={over ? 'text-red-600 font-bold' : warn ? 'text-yellow-600 font-semibold' : 'text-green-600 font-medium'}>
                      {p.val} ppm — {over ? `DANGER (> ${p.danger})` : warn ? `Attention (> ${p.warning})` : 'Normal'}
                    </span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: over ? '#EF4444' : warn ? '#F59E0B' : '#10B981' }} />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                    <span>0</span><span>Att: {p.warning}</span><span>Danger: {p.danger}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Info size={16} className="text-[#065A82]" />
            <h2 className="font-semibold text-gray-800">Conseils en temps reel</h2>
          </div>
          {(() => {
            const actifs = CONSEILS_CONFIG.filter(c => c.check(co, gaz, cov, temp, hum))
            if (actifs.length === 0) return (
              <div className="flex flex-col items-center justify-center py-6 gap-2">
                <CheckCircle size={32} className="text-green-400" />
                <p className="text-green-700 font-semibold text-sm">Qualite de l'air optimale</p>
                <p className="text-gray-400 text-xs text-center">Tous les parametres sont dans les normes. Aucune action requise.</p>
              </div>
            )
            return (
              <div className="space-y-3 overflow-y-auto max-h-[280px] pr-1">
                {actifs.map(({ key, level, Icon, title, message }) => {
                  const isDanger = level === 'danger'
                  return (
                    <div key={key} className={`rounded-xl border p-3 ${isDanger ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
                      <div className="flex items-start gap-2">
                        <Icon size={16} className={`mt-0.5 shrink-0 ${isDanger ? 'text-red-600' : 'text-yellow-600'}`} />
                        <div>
                          <p className={`text-sm font-semibold ${isDanger ? 'text-red-700' : 'text-yellow-700'}`}>{title}</p>
                          <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{message}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
