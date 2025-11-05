'use client'

import { useEffect, useRef } from 'react'

interface FlowParticle {
  x: number
  y: number
  progress: number
  speed: number
  size: number
  opacity: number
  color: string
}

interface ProgressFlowProps {
  progress?: number
  intensity?: 'low' | 'medium' | 'high'
}

export function ProgressFlow({ progress = 0, intensity = 'medium' }: ProgressFlowProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<FlowParticle[]>([])
  const animationFrameRef = useRef<number>()
  const timeRef = useRef(0)

  const colorPalette = ['#00d4ff', '#0099ff', '#00ffff', '#ff6b35']
  const particleCounts = { low: 15, medium: 30, high: 45 }

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

    // Initialize particles flowing from bottom-left to top-right (representing progress)
    const initParticles = () => {
      particlesRef.current = []
      const count = particleCounts[intensity]

      for (let i = 0; i < count; i++) {
        // Start particles from bottom-left, moving toward top-right
        const startProgress = Math.random()
        particlesRef.current.push({
          x: canvas.width * 0.1 + (canvas.width * 0.8 * startProgress),
          y: canvas.height * 0.9 - (canvas.height * 0.8 * startProgress),
          progress: startProgress,
          speed: Math.random() * 0.02 + 0.01,
          size: Math.random() * 3 + 2,
          opacity: Math.random() * 0.5 + 0.3,
          color: colorPalette[Math.floor(Math.random() * colorPalette.length)],
        })
      }
    }

    initParticles()

    const animate = () => {
      timeRef.current += 0.016
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Calculate progress-based flow direction
      const progressInfluence = progress / 100

      particlesRef.current.forEach((particle) => {
        // Update progress (forward motion)
        particle.progress += particle.speed * (1 + progressInfluence * 0.5)

        // Reset if completed
        if (particle.progress > 1) {
          particle.progress = 0
          particle.color = colorPalette[Math.floor(Math.random() * colorPalette.length)]
        }

        // Calculate position based on progress (diagonal flow: bottom-left → top-right)
        const baseX = canvas.width * 0.1
        const baseY = canvas.height * 0.9
        const targetX = canvas.width * 0.9
        const targetY = canvas.height * 0.1

        particle.x = baseX + (targetX - baseX) * particle.progress
        particle.y = baseY - (baseY - targetY) * particle.progress

        // Add wave motion
        const wave = Math.sin(timeRef.current * 3 + particle.progress * 10) * 5
        particle.x += wave * 0.3
        particle.y += wave * 0.3

        // Draw particle with forward motion trail
        const trailLength = 20
        const angle = Math.atan2(targetY - baseY, targetX - baseX)
        
        const trailGradient = ctx.createLinearGradient(
          particle.x - Math.cos(angle) * trailLength,
          particle.y - Math.sin(angle) * trailLength,
          particle.x,
          particle.y
        )
        trailGradient.addColorStop(0, particle.color + '00')
        trailGradient.addColorStop(1, particle.color + Math.floor(particle.opacity * 255).toString(16).padStart(2, '0'))

        // Draw trail
        ctx.beginPath()
        ctx.moveTo(particle.x - Math.cos(angle) * trailLength, particle.y - Math.sin(angle) * trailLength)
        ctx.lineTo(particle.x, particle.y)
        ctx.strokeStyle = trailGradient
        ctx.lineWidth = particle.size * 0.8
        ctx.globalAlpha = particle.opacity * 0.6
        ctx.stroke()

        // Draw main particle
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        
        const gradient = ctx.createRadialGradient(
          particle.x,
          particle.y,
          0,
          particle.x,
          particle.y,
          particle.size * 2
        )
        gradient.addColorStop(0, particle.color)
        gradient.addColorStop(0.5, particle.color + '80')
        gradient.addColorStop(1, particle.color + '00')

        ctx.fillStyle = gradient
        ctx.globalAlpha = particle.opacity
        ctx.shadowBlur = 10
        ctx.shadowColor = particle.color
        ctx.fill()
        ctx.shadowBlur = 0

        // Draw forward arrow
        ctx.save()
        ctx.translate(particle.x, particle.y)
        ctx.rotate(angle)
        
        ctx.beginPath()
        ctx.moveTo(-particle.size * 2, -particle.size)
        ctx.lineTo(0, 0)
        ctx.lineTo(-particle.size * 2, particle.size)
        ctx.strokeStyle = particle.color
        ctx.lineWidth = 1.5
        ctx.globalAlpha = particle.opacity * 0.8
        ctx.stroke()
        ctx.restore()
      })

      ctx.globalAlpha = 1

      // Draw progress flow line
      const flowLineWidth = 2
      const flowGradient = ctx.createLinearGradient(
        canvas.width * 0.1,
        canvas.height * 0.9,
        canvas.width * 0.9,
        canvas.height * 0.1
      )
      flowGradient.addColorStop(0, '#ff6b3540')
      flowGradient.addColorStop(0.5, '#00d4ff60')
      flowGradient.addColorStop(1, '#ff00ff40')

      ctx.beginPath()
      ctx.moveTo(canvas.width * 0.1, canvas.height * 0.9)
      
      // Add wave to the line
      const steps = 50
      for (let i = 0; i <= steps; i++) {
        const t = i / steps
        const x = canvas.width * 0.1 + (canvas.width * 0.8 * t)
        const y = canvas.height * 0.9 - (canvas.height * 0.8 * t)
        const wave = Math.sin(timeRef.current * 2 + t * 10) * 3
        if (i === 0) {
          ctx.moveTo(x, y + wave)
        } else {
          ctx.lineTo(x, y + wave)
        }
      }

      ctx.strokeStyle = flowGradient
      ctx.lineWidth = flowLineWidth
      ctx.globalAlpha = 0.3
      ctx.stroke()

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
  }, [progress, intensity])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.35 }}
    />
  )
}

