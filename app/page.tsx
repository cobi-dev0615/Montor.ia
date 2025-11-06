import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ImmersiveWorld } from '@/components/animations/ImmersiveWorld'
import { Sparkles, Target, TrendingUp } from 'lucide-react'

export default function Home() {
  return (
    <ImmersiveWorld particleIntensity="medium" glowIntensity={0.3}>
      <div className="min-h-screen flex flex-col bg-transparent">
        {/* Hero Section */}
        <section className="flex-1 flex items-center justify-center px-6 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-100 mb-6">
              Bem-vindo ao <span className="text-[#00d4ff] neon-glow holographic-text">Mentor.ai</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-4">
              Seu companheiro de inteligência artificial para autodomínio
            </p>
            <p className="text-lg text-gray-400 mb-12 max-w-2xl mx-auto">
              Transforme pequenos atos diários em progresso real com clareza, sabedoria, empatia, propósito e virtude.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login">
                <Button size="lg" className="w-full sm:w-auto">
                  Começar
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Criar Conta
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-gray-100 mb-12">
              Como o Mentor.ai Ajuda Você
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <FeatureCard
                icon={<Sparkles className="w-8 h-8" />}
                title="Orientação com IA"
                description="Obtenha mentoria personalizada de uma IA projetada para ajudá-lo a alcançar seus objetivos com sabedoria e clareza."
              />
              <FeatureCard
                icon={<Target className="w-8 h-8" />}
                title="Acompanhamento de Metas"
                description="Defina sua única coisa e divida-a em marcos acionáveis com acompanhamento claro de progresso."
              />
              <FeatureCard
                icon={<TrendingUp className="w-8 h-8" />}
                title="Visualização de Progresso"
                description="Veja seu crescimento através de indicadores visuais de progresso, sequências de consistência e representação de avatar em evolução."
              />
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-[rgba(0,212,255,0.3)] py-8 px-6">
          <div className="max-w-6xl mx-auto text-center">
            <p className="text-sm text-gray-400">
              © 2024 Mentor.ai. Todos os direitos reservados.
            </p>
            <p className="text-xs mt-2 text-gray-500">
              Construído com propósito, clareza e virtude.
            </p>
          </div>
        </footer>
      </div>
    </ImmersiveWorld>
  )
}

function FeatureCard({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode
  title: string
  description: string 
}) {
  return (
    <Card className="p-6 hover:shadow-[0_0_30px_rgba(0,212,255,0.3)] transition-all">
      <div className="text-[#00d4ff] mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-100 mb-2">{title}</h3>
      <p className="text-gray-300">{description}</p>
    </Card>
  )
}
