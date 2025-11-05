import { ReactNode } from 'react'
import { Card } from '@/components/ui/Card'

interface StatsCardProps {
  title: string
  value: string
  subValue?: string
  icon?: ReactNode
}

export function StatsCard({ title, value, subValue, icon }: StatsCardProps) {
  return (
    <Card variant="stat">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-400 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-100">{value}</p>
          {subValue && (
            <p className="text-sm text-gray-500 mt-1">{subValue}</p>
          )}
        </div>
        {icon && (
          <div className="text-primary-600">
            {icon}
          </div>
        )}
      </div>
    </Card>
  )
}
