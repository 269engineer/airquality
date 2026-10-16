import { useEffect, useState } from 'react'
import { X, AlertTriangle, Info, CheckCircle } from 'lucide-react'

const SEV_STYLE = {
  critical: {
    bar:  'bg-red-500',
    bg:   'bg-white border-l-4 border-red-500',
    icon: AlertTriangle,
    iconClass: 'text-red-500',
    label: 'CRITIQUE',
    labelClass: 'text-red-600 font-bold',
  },
  warning: {
    bar:  'bg-yellow-400',
    bg:   'bg-white border-l-4 border-yellow-400',
    icon: AlertTriangle,
    iconClass: 'text-yellow-500',
    label: 'Attention',
    labelClass: 'text-yellow-600 font-semibold',
  },
  info: {
    bar:  'bg-blue-400',
    bg:   'bg-white border-l-4 border-blue-400',
    icon: Info,
    iconClass: 'text-blue-500',
    label: 'Info',
    labelClass: 'text-blue-600 font-semibold',
  },
}

const DURATION = 6000  // 6 secondes avant auto-fermeture

export function Toast({ id, severity, title, message, sensor, value, unit, onClose }) {
  const [visible,  setVisible]  = useState(false)
  const [progress, setProgress] = useState(100)

  const cfg  = SEV_STYLE[severity] || SEV_STYLE.info
  const Icon = cfg.icon

  // Apparition animee
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 20)
    return () => clearTimeout(t)
  }, [])

  // Barre de progression + auto-fermeture
  useEffect(() => {
    const step = 50
    const decrement = (step / DURATION) * 100
    const interval = setInterval(() => {
      setProgress(p => {
        if (p <= 0) { clearInterval(interval); onClose(id); return 0 }
        return p - decrement
      })
    }, step)
    return () => clearInterval(interval)
  }, [id, onClose])

  return (
    <div className={`
      w-80 rounded-xl shadow-lg overflow-hidden transition-all duration-300
      ${cfg.bg}
      ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}
    `}>
      {/* Corps */}
      <div className="p-4 flex items-start gap-3">
        <Icon size={20} className={`shrink-0 mt-0.5 ${cfg.iconClass}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span className={`text-xs ${cfg.labelClass}`}>{cfg.label}</span>
            <button onClick={() => onClose(id)} className="text-gray-300 hover:text-gray-500 shrink-0">
              <X size={14} />
            </button>
          </div>
          <p className="text-gray-800 font-semibold text-sm leading-snug">{title}</p>
          <p className="text-gray-500 text-xs mt-1 leading-relaxed">{message}</p>
          {sensor && (
            <p className="text-xs text-gray-400 mt-1.5 font-mono">
              {sensor} — {value} {unit}
            </p>
          )}
        </div>
      </div>
      {/* Barre de progression */}
      <div className="h-1 bg-gray-100">
        <div
          className={`h-full ${cfg.bar} transition-none`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

export function ToastContainer({ toasts, onClose }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto">
          <Toast {...t} onClose={onClose} />
        </div>
      ))}
    </div>
  )
}
