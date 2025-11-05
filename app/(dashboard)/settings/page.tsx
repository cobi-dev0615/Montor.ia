import { Card } from '@/components/ui/Card'
import { ProfileSection } from '@/components/settings/ProfileSection'
import { AccountSection } from '@/components/settings/AccountSection'
import { DataSection } from '@/components/settings/DataSection'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-100">Settings</h1>
        <p className="text-gray-400 mt-1">Manage your account and preferences</p>
      </div>

      {/* Grid layout: Profile and Data on left, Account on right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column: Profile and Data Management stacked */}
        <div className="lg:col-span-1 space-y-6">
          <ProfileSection />
          <DataSection />
        </div>

        {/* Right column: Account */}
        <div className="lg:col-span-1">
          <AccountSection />
        </div>
      </div>
    </div>
  )
}
