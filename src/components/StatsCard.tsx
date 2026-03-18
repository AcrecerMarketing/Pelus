'use client'

interface StatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: string
  trend?: { value: number; label: string }
  color?: 'purple' | 'green' | 'blue' | 'orange'
}

const colorMap = {
  purple: { bg: 'bg-primary-50', icon: 'bg-primary-100 text-primary-700', text: 'text-primary-900' },
  green: { bg: 'bg-emerald-50', icon: 'bg-emerald-100 text-emerald-700', text: 'text-emerald-900' },
  blue: { bg: 'bg-blue-50', icon: 'bg-blue-100 text-blue-700', text: 'text-blue-900' },
  orange: { bg: 'bg-orange-50', icon: 'bg-orange-100 text-orange-700', text: 'text-orange-900' },
}

export default function StatsCard({ title, value, subtitle, icon, trend, color = 'purple' }: StatsCardProps) {
  const colors = colorMap[color]

  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className={`text-2xl font-bold mt-1 ${colors.text}`}>{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend.value >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              <span>{trend.value >= 0 ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}% {trend.label}</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${colors.icon}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
