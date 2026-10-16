import { getAQILevel } from '../data/mockData'

export default function AQIBadge({ aqi, size = 'md' }) {
  const level = getAQILevel(aqi)
  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${level.bg} ${level.text} ${sizes[size]}`}>
      <span className={`w-2 h-2 rounded-full ${level.dot}`} />
      {level.label}
    </span>
  )
}
