import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Sparkles, Target, TrendingUp } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center bg-gradient-to-br from-primary-50 via-primary-100 to-primary-50 px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Welcome to <span className="text-primary-600">Mentor.ai</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 mb-4">
            Your artificial intelligence companion for self-mastery
          </p>
          <p className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto">
            Transform small daily acts into real progress with clarity, wisdom, empathy, purpose, and virtue.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <Button size="lg" className="w-full sm:w-auto">
                Get Started
              </Button>
            </Link>
            <Link href="/register">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Create Account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            How Mentor.ai Helps You
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Sparkles className="w-8 h-8" />}
              title="AI-Powered Guidance"
              description="Get personalized mentorship from an AI designed to help you achieve your goals with wisdom and clarity."
            />
            <FeatureCard
              icon={<Target className="w-8 h-8" />}
              title="Goal Tracking"
              description="Define your one thing and break it down into actionable milestones with clear progress tracking."
            />
            <FeatureCard
              icon={<TrendingUp className="w-8 h-8" />}
              title="Progress Visualization"
              description="See your growth through visual progress indicators, consistency streaks, and evolving avatar representation."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary-600 text-white py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Your Journey?</h2>
          <p className="text-xl mb-8 text-primary-100">
            Join Mentor.ai today and begin transforming your life, one step at a time.
          </p>
          <Link href="/register">
            <Button variant="secondary" size="lg">
              Create Your Account
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-sm">
            © 2024 Mentor.ai. All rights reserved.
          </p>
          <p className="text-xs mt-2">
            Built with purpose, clarity, and virtue.
          </p>
        </div>
      </footer>
    </div>
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
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="text-primary-600 mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  )
}
