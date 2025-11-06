import Link from 'next/link'
import { LoginForm } from '@/components/auth/LoginForm'
import { Card } from '@/components/ui/Card'

export default function LoginPage() {
  return (
    <Card>
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-[#00d4ff] neon-glow holographic-text mb-2">Mentor.ai</h1>
        <h2 className="text-2xl font-bold text-gray-100 mb-2">Bem-vindo de Volta</h2>
        <p className="text-gray-400">Faça login para continuar sua jornada</p>
      </div>
      <LoginForm />
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-300">
          Não tem uma conta?{' '}
          <Link href="/register" className="text-[#00d4ff] hover:text-[#00ffff] hover:underline font-medium transition-colors">
            Criar conta
          </Link>
        </p>
      </div>
    </Card>
  )
}
