import Link from 'next/link'
import { RegisterForm } from '@/components/auth/RegisterForm'
import { Card } from '@/components/ui/Card'

export default function RegisterPage() {
  return (
    <Card>
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-primary-600 mb-2">Mentor.ai</h1>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Account</h2>
        <p className="text-gray-600">Start your journey with Mentor.ai</p>
      </div>
      <RegisterForm />
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="text-primary-600 hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </Card>
  )
}
