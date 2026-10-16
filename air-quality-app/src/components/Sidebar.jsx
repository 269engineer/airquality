import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Building2, History, Wind } from 'lucide-react'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard'  },
  { to: '/map',       icon: Building2,       label: 'Espaces'    },
  { to: '/history',   icon: History,         label: 'Historique' },
]

export default function Sidebar() {
  return (
    <aside className="w-60 bg-[#0A1628] flex flex-col py-6 px-4 shrink-0">
      <div className="flex items-center gap-3 mb-10 px-2">
        <div className="w-9 h-9 rounded-xl bg-[#02C39A] flex items-center justify-center">
          <Wind size={20} color="#0A1628" strokeWidth={2.5} />
        </div>
        <div>
          <p className="text-white font-bold text-lg leading-tight">AirWatch</p>
          <p className="text-[#7FB3C8] text-xs">Qualite de l'Air</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-[#065A82] text-white'
                  : 'text-[#7FB3C8] hover:bg-[#0D2137] hover:text-white'
              }`
            }>
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto px-2">
        <div className="border-t border-[#0D2137] pt-4">
          <p className="text-[#7FB3C8] text-xs">ESP32 actif</p>
          <p className="text-white text-xs font-medium mt-0.5">
            {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
    </aside>
  )
}
