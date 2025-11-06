import Link from 'next/link'
import { RegisterForm } from '@/components/auth/RegisterForm'
import { Card } from '@/components/ui/Card'

export default function RegisterPage() {
  return (
    <Card>
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-[#00d4ff] neon-glow holographic-text mb-2">Mentor.ai</h1>
        <h2 className="text-2xl font-bold text-gray-100 mb-2">Criar Conta</h2>
        <p className="text-gray-400">Comece sua jornada com o Mentor.ai</p>
      </div>
      <RegisterForm />
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-300">
          Já tem uma conta?{' '}
          <Link href="/login" className="text-[#00d4ff] hover:text-[#00ffff] hover:underline font-medium transition-colors">
            Entrar
          </Link>
        </p>
      </div>
    </Card>
  )
}
