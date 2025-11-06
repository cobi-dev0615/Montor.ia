import { ProfileSection } from '@/components/settings/ProfileSection'
import { AccountSection } from '@/components/settings/AccountSection'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-100">Settings</h1>
        <p className="text-gray-400 mt-1">Manage your account and preferences</p>
      </div>

      {/* Grid layout: Profile on left, Account on right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column: Profile */}
        <div className="lg:col-span-1">
          <ProfileSection />
        </div>

        {/* Right column: Account */}
        <div className="lg:col-span-1">
          <AccountSection />
        </div>
      </div>
    </div>
  )
}
