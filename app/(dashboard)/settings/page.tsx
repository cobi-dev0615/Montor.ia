import { Card } from '@/components/ui/Card'
import { ProfileSection } from '@/components/settings/ProfileSection'
import { AccountSection } from '@/components/settings/AccountSection'
import { DataSection } from '@/components/settings/DataSection'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account and preferences</p>
      </div>

      <ProfileSection />
      <AccountSection />
      <DataSection />
    </div>
  )
}
