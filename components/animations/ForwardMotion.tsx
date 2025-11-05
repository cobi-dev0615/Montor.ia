'use client'

import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
  life: number
  maxLife: number
  color: string
}

interface ForwardMotionProps {
  intensity?: 'low' | 'medium' | 'high'
  direction?: 'left-to-right' | 'right-to-left' | 'top-to-bottom' | 'bottom-to-top'
  speed?: number
}

export function ForwardMotion({
  intensity = 'medium',
  direction = 'left-to-right',
  speed = 1,
}: ForwardMotionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animationFrameRef = useRef<number>()
  const timeRef = useRef(0)

  // Color palette for forward motion energy
  const colorPalette = ['#00d4ff', '#0099ff', '#00ffff', '#ff6b35', '#ff00ff']

  // Direction vectors
  const directionVectors = {
    'left-to-right': { vx: 1, vy: 0 },
    'right-to-left': { vx: -1, vy: 0 },
    'top-to-bottom': { vx: 0, vy: 1 },
    'bottom-to-top': { vx: 0, vy: -1 },
  }

  // Intensity multipliers
  const intensityMultipliers = {
    low: { count: 20, speed: 0.5 },
    medium: { count: 40, speed: 1 },
    high: { count: 60, speed: 1.5 },
  }

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

    const dir = directionVectors[direction]
    const intensityConfig = intensityMultipliers[intensity]
    const baseSpeed = intensityConfig.speed * speed

    // Initialize particles
    const initParticles = () => {
      particlesRef.current = []

      for (let i = 0; i < intensityConfig.count; i++) {
        let startX, startY

        // Spawn particles from the starting edge based on direction
        if (direction === 'left-to-right') {
          startX = -20
          startY = Math.random() * canvas.height
        } else if (direction === 'right-to-left') {
          startX = canvas.width + 20
          startY = Math.random() * canvas.height
        } else if (direction === 'top-to-bottom') {
          startX = Math.random() * canvas.width
          startY = -20
        } else {
          startX = Math.random() * canvas.width
          startY = canvas.height + 20
        }

        particlesRef.current.push({
          x: startX,
          y: startY,
          vx: dir.vx * baseSpeed * (Math.random() * 2 + 1),
          vy: dir.vy * baseSpeed * (Math.random() * 2 + 1) + (Math.random() - 0.5) * 0.5,
          size: Math.random() * 4 + 2,
          opacity: Math.random() * 0.6 + 0.3,
          life: 0,
          maxLife: Math.random() * 100 + 100,
          color: colorPalette[Math.floor(Math.random() * colorPalette.length)],
        })
      }
    }

    initParticles()

    const animate = () => {
      timeRef.current += 0.016
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Create motion trails
      ctx.shadowBlur = 15
      ctx.shadowColor = '#00d4ff'

      particlesRef.current.forEach((particle, i) => {
        // Update position
        particle.x += particle.vx
        particle.y += particle.vy
        particle.life += 1

        // Add wave motion for organic feel
        const wave = Math.sin(timeRef.current * 2 + i) * 2
        if (direction === 'left-to-right' || direction === 'right-to-left') {
          particle.y += wave * 0.3
        } else {
          particle.x += wave * 0.3
        }

        // Reset particle if it goes off screen
        const isOffScreen =
          (direction === 'left-to-right' && particle.x > canvas.width + 20) ||
          (direction === 'right-to-left' && particle.x < -20) ||
          (direction === 'top-to-bottom' && particle.y > canvas.height + 20) ||
          (direction === 'bottom-to-top' && particle.y < -20)

        if (isOffScreen) {
          // Reset to starting position
          if (direction === 'left-to-right') {
            particle.x = -20
            particle.y = Math.random() * canvas.height
          } else if (direction === 'right-to-left') {
            particle.x = canvas.width + 20
            particle.y = Math.random() * canvas.height
          } else if (direction === 'top-to-bottom') {
            particle.x = Math.random() * canvas.width
            particle.y = -20
          } else {
            particle.x = Math.random() * canvas.width
            particle.y = canvas.height + 20
          }
          particle.life = 0
          particle.color = colorPalette[Math.floor(Math.random() * colorPalette.length)]
        }

        // Calculate opacity based on life and position
        const lifeProgress = (particle.life % particle.maxLife) / particle.maxLife
        const pulse = (Math.sin(lifeProgress * Math.PI * 2) + 1) / 2
        const currentOpacity = particle.opacity * (0.5 + pulse * 0.5)

        // Draw particle with motion trail
        const trailLength = 15
        const trailGradient = ctx.createLinearGradient(
          particle.x - dir.vx * trailLength,
          particle.y - dir.vy * trailLength,
          particle.x,
          particle.y
        )
        trailGradient.addColorStop(0, particle.color + '00')
        trailGradient.addColorStop(1, particle.color + Math.floor(currentOpacity * 255).toString(16).padStart(2, '0'))

        // Draw trail
        ctx.beginPath()
        ctx.moveTo(particle.x - dir.vx * trailLength, particle.y - dir.vy * trailLength)
        ctx.lineTo(particle.x, particle.y)
        ctx.strokeStyle = trailGradient
        ctx.lineWidth = particle.size * 0.5
        ctx.globalAlpha = currentOpacity * 0.5
        ctx.stroke()

        // Draw main particle
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)

        const particleGradient = ctx.createRadialGradient(
          particle.x,
          particle.y,
          0,
          particle.x,
          particle.y,
          particle.size * 2
        )
        particleGradient.addColorStop(0, particle.color)
        particleGradient.addColorStop(0.5, particle.color + '80')
        particleGradient.addColorStop(1, particle.color + '00')

        ctx.fillStyle = particleGradient
        ctx.globalAlpha = currentOpacity
        ctx.fill()

        // Draw forward arrow indicator on some particles
        if (i % 5 === 0) {
          ctx.save()
          ctx.translate(particle.x, particle.y)
          
          // Rotate based on direction
          let angle = 0
          if (direction === 'left-to-right') angle = 0
          else if (direction === 'right-to-left') angle = Math.PI
          else if (direction === 'top-to-bottom') angle = Math.PI / 2
          else angle = -Math.PI / 2
          
          ctx.rotate(angle)
          
          ctx.beginPath()
          ctx.moveTo(-particle.size * 2, -particle.size)
          ctx.lineTo(0, 0)
          ctx.lineTo(-particle.size * 2, particle.size)
          ctx.strokeStyle = particle.color
          ctx.lineWidth = 1
          ctx.globalAlpha = currentOpacity * 0.6
          ctx.stroke()
          ctx.restore()
        }
      })

      ctx.globalAlpha = 1
      ctx.shadowBlur = 0

      // Draw energy flow lines
      const flowLineCount = 3
      for (let i = 0; i < flowLineCount; i++) {
        const offset = (timeRef.current * 50 * baseSpeed) % (canvas.width + canvas.height)
        
        ctx.beginPath()
        ctx.strokeStyle = `rgba(0, 212, 255, ${0.1 + i * 0.05})`
        ctx.lineWidth = 1
        ctx.globalAlpha = 0.2

        if (direction === 'left-to-right') {
          const y = (canvas.height / (flowLineCount + 1)) * (i + 1) + Math.sin(timeRef.current + i) * 10
          ctx.moveTo(-offset, y)
          ctx.lineTo(canvas.width + 20, y)
        } else if (direction === 'right-to-left') {
          const y = (canvas.height / (flowLineCount + 1)) * (i + 1) + Math.sin(timeRef.current + i) * 10
          ctx.moveTo(canvas.width + offset, y)
          ctx.lineTo(-20, y)
        } else if (direction === 'top-to-bottom') {
          const x = (canvas.width / (flowLineCount + 1)) * (i + 1) + Math.cos(timeRef.current + i) * 10
          ctx.moveTo(x, -offset)
          ctx.lineTo(x, canvas.height + 20)
        } else {
          const x = (canvas.width / (flowLineCount + 1)) * (i + 1) + Math.cos(timeRef.current + i) * 10
          ctx.moveTo(x, canvas.height + offset)
          ctx.lineTo(x, -20)
        }

        ctx.stroke()
      }

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
  }, [intensity, direction, speed])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.4 }}
    />
  )
}

