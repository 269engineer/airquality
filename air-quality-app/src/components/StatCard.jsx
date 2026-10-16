export default function StatCard({ label, value, unit, trend, color = 'blue' }) {
  const colors = {
    blue:   { border: 'border-blue-200',   bg: 'bg-blue-50',   text: 'text-blue-700'   },
    green:  { border: 'border-green-200',  bg: 'bg-green-50',  text: 'text-green-700'  },
    yellow: { border: 'border-yellow-200', bg: 'bg-yellow-50', text: 'text-yellow-700' },
    orange: { border: 'border-orange-200', bg: 'bg-orange-50', text: 'text-orange-700' },
    red:    { border: 'border-red-200',    bg: 'bg-red-50',    text: 'text-red-700'    },
    teal:   { border: 'border-teal-200',   bg: 'bg-teal-50',   text: 'text-teal-700'   },
  }
  const c = colors[color] || colors.blue

  return (
    <div className={`bg-white rounded-2xl border ${c.border} p-5 shadow-sm hover:shadow-md transition-shadow`}>
      <p className="text-gray-500 text-sm font-medium mb-1">{label}</p>
      <div className="flex items-end gap-1">
        <span className={`text-3xl font-bold ${c.text}`}>{value}</span>
        <span className="text-gray-400 text-sm mb-1">{unit}</span>
      </div>
      {trend !== undefined && (
        <p className={`text-xs mt-2 ${trend > 0 ? 'text-red-500' : 'text-green-500'}`}>
          {trend > 0 ? '▲' : '▼'} {Math.abs(trend)}% vs hier
        </p>
      )}
    </div>
  )
}
