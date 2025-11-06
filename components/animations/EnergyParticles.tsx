'use client'

import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  size: number
  opacity: number
  color: string
  life: number
  maxLife: number
}

interface EnergyParticlesProps {
  intensity?: 'low' | 'medium' | 'high'
  particleCount?: number
}

export function EnergyParticles({
  intensity = 'high',
  particleCount = 100,
}: EnergyParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animationFrameRef = useRef<number>()
  const timeRef = useRef(0)

  // Color palette: orange, blue, electric (cyan/magenta)
  const colorPalette = [
    '#ff6b35', // Warm orange
    '#ff8c42', // Bright orange
    '#00d4ff', // Electric blue
    '#0099ff', // Neon blue
    '#ff00ff', // Electric magenta
    '#00ffff', // Cyan
    '#ffaa00', // Golden orange
  ]

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Initialize particles
    const initParticles = () => {
      particlesRef.current = []
      const speed = intensity === 'high' ? 2 : intensity === 'medium' ? 1.5 : 1

      for (let i = 0; i < particleCount; i++) {
        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          z: Math.random(),
          vx: (Math.random() - 0.5) * speed,
          vy: (Math.random() - 0.5) * speed,
          vz: (Math.random() - 0.5) * 0.5,
          size: Math.random() * 3 + 1,
          opacity: Math.random() * 0.4 + 0.1,
          color: colorPalette[Math.floor(Math.random() * colorPalette.length)],
          life: Math.random(),
          maxLife: Math.random() * 100 + 50,
        })
      }
    }

    initParticles()

    const animate = () => {
      timeRef.current += 0.01
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Create glow effect
      ctx.shadowBlur = 20
      ctx.shadowColor = '#00ffff'

      particlesRef.current.forEach((particle, i) => {
        // Update position with wave motion
        particle.x += particle.vx + Math.sin(timeRef.current + i) * 0.5
        particle.y += particle.vy + Math.cos(timeRef.current + i) * 0.5
        particle.z = (Math.sin(timeRef.current * 2 + i) + 1) / 2

        // Wrap around edges
        if (particle.x < 0) particle.x = canvas.width
        if (particle.x > canvas.width) particle.x = 0
        if (particle.y < 0) particle.y = canvas.height
        if (particle.y > canvas.height) particle.y = 0

        // Update life for pulsing effect
        particle.life += 0.5
        const pulse = (Math.sin(particle.life / 10) + 1) / 2

        // Draw particle with glow
        ctx.beginPath()
        const size = particle.size * (1 + pulse * 0.5) * (1 + particle.z)
        ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2)
        
        // Create gradient for energy effect
        const gradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, size * 2
        )
        gradient.addColorStop(0, particle.color)
        gradient.addColorStop(0.5, particle.color + '80')
        gradient.addColorStop(1, particle.color + '00')
        
        ctx.fillStyle = gradient
        ctx.globalAlpha = particle.opacity * pulse
        ctx.fill()

        // Draw energy trail
        if (i > 0) {
          const prevParticle = particlesRef.current[i - 1]
          const distance = Math.sqrt(
            Math.pow(particle.x - prevParticle.x, 2) +
            Math.pow(particle.y - prevParticle.y, 2)
          )

          if (distance < 80) {
            ctx.beginPath()
            ctx.moveTo(prevParticle.x, prevParticle.y)
            ctx.lineTo(particle.x, particle.y)
            
            const trailGradient = ctx.createLinearGradient(
              prevParticle.x, prevParticle.y,
              particle.x, particle.y
            )
            trailGradient.addColorStop(0, prevParticle.color + '40')
            trailGradient.addColorStop(1, particle.color + '40')
            
            ctx.strokeStyle = trailGradient
            ctx.lineWidth = 1
            ctx.globalAlpha = (1 - distance / 80) * 0.15
            ctx.stroke()
          }
        }
      })

      ctx.globalAlpha = 1
      ctx.shadowBlur = 0

      // Draw connections between nearby particles
      particlesRef.current.forEach((particle, i) => {
        particlesRef.current.slice(i + 1).forEach((otherParticle) => {
          const dx = particle.x - otherParticle.x
          const dy = particle.y - otherParticle.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < 150) {
            ctx.beginPath()
            ctx.moveTo(particle.x, particle.y)
            ctx.lineTo(otherParticle.x, otherParticle.y)
            
            const connectionGradient = ctx.createLinearGradient(
              particle.x, particle.y,
              otherParticle.x, otherParticle.y
            )
            connectionGradient.addColorStop(0, particle.color + '20')
            connectionGradient.addColorStop(1, otherParticle.color + '20')
            
            ctx.strokeStyle = connectionGradient
            ctx.lineWidth = 0.5
            ctx.globalAlpha = (1 - distance / 150) * 0.1
            ctx.stroke()
          }
        })
      })

      ctx.globalAlpha = 1
      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [intensity, particleCount])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.3 }}
    />
  )
}

