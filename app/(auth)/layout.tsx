import { ImmersiveWorld } from '@/components/animations/ImmersiveWorld'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ImmersiveWorld particleIntensity="low" glowIntensity={0.2}>
      <div className="min-h-screen flex items-center justify-center bg-transparent px-4">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </ImmersiveWorld>
  )
}
