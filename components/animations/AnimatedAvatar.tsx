'use client'

import { useEffect, useRef, useState } from 'react'

interface AnimatedAvatarProps {
  stage: string
  level: number
  size?: 'sm' | 'md' | 'lg'
  showParticles?: boolean
  intensity?: number
}

// Map stage names to icons
const stageIcons: Record<string, string> = {
  seed: '🌱',
  sprout: '🌿',
  sapling: '🌳',
  tree: '🌲',
  oak: '🏛️',
}

// Stage-specific animation properties
const stageAnimations: Record<string, {
  pulseSpeed: number
  rotationSpeed: number
  particleCount: number
  glowColor: string
}> = {
  seed: {
    pulseSpeed: 2,
    rotationSpeed: 0,
    particleCount: 3,
    glowColor: '#00d4ff',
  },
  sprout: {
    pulseSpeed: 1.5,
    rotationSpeed: 0.5,
    particleCount: 5,
    glowColor: '#00ff88',
  },
  sapling: {
    pulseSpeed: 1,
    rotationSpeed: 0.3,
    particleCount: 8,
    glowColor: '#00d4ff',
  },
  tree: {
    pulseSpeed: 0.8,
    rotationSpeed: 0.2,
    particleCount: 12,
    glowColor: '#ff6b35',
  },
  oak: {
    pulseSpeed: 0.6,
    rotationSpeed: 0.1,
    particleCount: 15,
    glowColor: '#ff00ff',
  },
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
  life: number
  maxLife: number
}

export function AnimatedAvatar({
  stage,
  level,
  size = 'md',
  showParticles = true,
  intensity = 1,
}: AnimatedAvatarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationFrameRef = useRef<number>()
  const particlesRef = useRef<Particle[]>([])
  const timeRef = useRef(0)
  const rotationRef = useRef(0)
  const [pulseScale, setPulseScale] = useState(1)
  const [rotation, setRotation] = useState(0)

  const icon = stageIcons[stage] || '🌱'
  const animation = stageAnimations[stage] || stageAnimations.seed
  const sizeClasses = {
    sm: { container: 'w-16 h-16', icon: 'text-3xl', canvas: 64 },
    md: { container: 'w-32 h-32 md:w-48 md:h-48', icon: 'text-6xl md:text-8xl', canvas: 192 },
    lg: { container: 'w-48 h-48 md:w-64 md:h-64', icon: 'text-8xl md:text-9xl', canvas: 256 },
  }
  const sizeConfig = sizeClasses[size]

  // Pulse and rotation animation for breathing effect
  useEffect(() => {
    let animationFrameId: number
    let lastTime = 0

    const animate = (currentTime: number) => {
      if (!lastTime) lastTime = currentTime
      const deltaTime = (currentTime - lastTime) / 1000
      lastTime = currentTime

      const now = Date.now() * 0.001
      setPulseScale(prev => {
        const target = 1 + Math.sin(now * animation.pulseSpeed) * 0.05
        return prev + (target - prev) * 0.1
      })
      
      rotationRef.current += animation.rotationSpeed * deltaTime * 30
      if (rotationRef.current >= 360) rotationRef.current -= 360
      setRotation(rotationRef.current)

      animationFrameId = requestAnimationFrame(animate)
    }

    animationFrameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrameId)
  }, [animation.pulseSpeed, animation.rotationSpeed])

  // Particle system for growth energy
  useEffect(() => {
    if (!showParticles || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const radius = canvas.width * 0.4

    // Initialize particles
    const initParticles = () => {
      particlesRef.current = []
      for (let i = 0; i < animation.particleCount * intensity; i++) {
        const angle = (Math.PI * 2 * i) / (animation.particleCount * intensity)
        const distance = radius * (0.7 + Math.random() * 0.3)
        particlesRef.current.push({
          x: centerX + Math.cos(angle) * distance,
          y: centerY + Math.sin(angle) * distance,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          size: Math.random() * 2 + 1,
          opacity: Math.random() * 0.5 + 0.3,
          life: 0,
          maxLife: Math.random() * 100 + 50,
        })
      }
    }

    initParticles()

    const animate = () => {
      timeRef.current += 0.016
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particlesRef.current.forEach((particle, i) => {
        // Update position in orbit
        const angle = (Math.PI * 2 * i) / particlesRef.current.length + timeRef.current * animation.rotationSpeed
        const distance = radius * (0.7 + Math.sin(timeRef.current * 2 + i) * 0.2)
        
        particle.x = centerX + Math.cos(angle) * distance
        particle.y = centerY + Math.sin(angle) * distance

        // Add small random movement
        particle.x += particle.vx
        particle.y += particle.vy

        // Keep particles in orbit
        const dx = particle.x - centerX
        const dy = particle.y - centerY
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist > radius * 1.2) {
          particle.vx *= -0.5
          particle.vy *= -0.5
        }

        // Update life for pulsing
        particle.life += 1
        if (particle.life > particle.maxLife) {
          particle.life = 0
        }

        // Calculate opacity with pulsing
        const lifeProgress = (particle.life % particle.maxLife) / particle.maxLife
        const pulse = (Math.sin(lifeProgress * Math.PI * 2) + 1) / 2
        const currentOpacity = particle.opacity * (0.5 + pulse * 0.5) * intensity

        // Draw particle
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
        gradient.addColorStop(0, animation.glowColor)
        gradient.addColorStop(0.5, animation.glowColor + '80')
        gradient.addColorStop(1, animation.glowColor + '00')

        ctx.fillStyle = gradient
        ctx.globalAlpha = currentOpacity
        ctx.shadowBlur = 10
        ctx.shadowColor = animation.glowColor
        ctx.fill()
      })

      ctx.globalAlpha = 1
      ctx.shadowBlur = 0

      // Draw energy rings
      const ringCount = 2
      for (let i = 0; i < ringCount; i++) {
        const ringRadius = radius * (0.8 + i * 0.2) + Math.sin(timeRef.current * 2 + i) * 5
        ctx.beginPath()
        ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2)
        ctx.strokeStyle = animation.glowColor + Math.floor(20 * intensity).toString(16).padStart(2, '0')
        ctx.lineWidth = 1
        ctx.globalAlpha = 0.2 * intensity
        ctx.stroke()
      }

      ctx.globalAlpha = 1
      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [showParticles, animation, intensity])

  return (
    <div
      ref={containerRef}
      className={`relative ${sizeConfig.container} flex items-center justify-center`}
    >
      {/* Canvas for particles */}
      {showParticles && (
        <canvas
          ref={canvasRef}
          width={sizeConfig.canvas}
          height={sizeConfig.canvas}
          className="absolute inset-0 pointer-events-none"
          style={{ opacity: 0.7 }}
        />
      )}

      {/* Avatar icon with animations */}
      <div
        className={`relative z-10 ${sizeConfig.icon} select-none avatar-icon`}
        style={{
          transform: `scale(${pulseScale}) rotate(${rotation}deg)`,
          filter: `drop-shadow(0 0 ${8 * intensity}px ${animation.glowColor})`,
          transition: 'transform 0.1s ease-out, filter 0.3s ease-out',
        }}
      >
        {icon}
      </div>

      {/* Glow effect */}
      <div
        className="absolute inset-0 rounded-full blur-xl pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${animation.glowColor}40, transparent 70%)`,
          opacity: 0.5 * intensity,
          animation: 'pulse 2s ease-in-out infinite',
        }}
      />

      {/* Growth energy waves */}
      <div className="absolute inset-0 rounded-full pointer-events-none overflow-hidden">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute inset-0 rounded-full border-2 growth-wave"
            style={{
              borderColor: animation.glowColor,
              opacity: 0.3 * intensity,
              animation: `growthWave ${2 + i * 0.5}s ease-out infinite`,
              animationDelay: `${i * 0.7}s`,
              transform: 'scale(0.8)',
            }}
          />
        ))}
      </div>
    </div>
  )
}

