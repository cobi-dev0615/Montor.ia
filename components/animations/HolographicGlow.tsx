'use client'

import { useEffect, useRef } from 'react'

interface HolographicGlowProps {
  intensity?: number
}

export function HolographicGlow({ intensity = 0.25 }: HolographicGlowProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  return (
    <>
      {/* Multiple glow layers for holographic effect */}
      <div
        ref={containerRef}
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: `
            radial-gradient(circle at 10% 20%, rgba(0, 212, 255, ${intensity * 0.6}) 0%, transparent 40%),
            radial-gradient(circle at 90% 80%, rgba(255, 107, 53, ${intensity * 0.6}) 0%, transparent 40%),
            radial-gradient(circle at 50% 50%, rgba(255, 0, 255, ${intensity * 0.4}) 0%, transparent 50%),
            radial-gradient(circle at 30% 70%, rgba(0, 153, 255, ${intensity * 0.5}) 0%, transparent 40%),
            radial-gradient(circle at 70% 30%, rgba(255, 170, 0, ${intensity * 0.5}) 0%, transparent 40%)
          `,
          animation: 'holographicPulse 8s ease-in-out infinite',
          mixBlendMode: 'screen',
        }}
      />
      
      {/* Scan line effect for holographic feel */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: `
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(0, 212, 255, 0.015) 2px,
              rgba(0, 212, 255, 0.015) 4px
            )
          `,
          animation: 'scanLine 10s linear infinite',
        }}
      />
      
      {/* Edge glow */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          boxShadow: `
            inset 0 0 100px rgba(0, 212, 255, ${intensity * 0.3}),
            inset 0 0 200px rgba(255, 107, 53, ${intensity * 0.2})
          `,
        }}
      />
    </>
  )
}

// Add CSS animations
if (typeof document !== 'undefined' && !document.getElementById('holographic-style')) {
  const style = document.createElement('style')
  style.id = 'holographic-style'
  style.textContent = `
    @keyframes holographicPulse {
      0%, 100% {
        filter: hue-rotate(0deg) brightness(1);
        transform: scale(1);
      }
      25% {
        filter: hue-rotate(90deg) brightness(1.1);
        transform: scale(1.05);
      }
      50% {
        filter: hue-rotate(180deg) brightness(1.2);
        transform: scale(1.1);
      }
      75% {
        filter: hue-rotate(270deg) brightness(1.1);
        transform: scale(1.05);
      }
    }
    
    @keyframes scanLine {
      0% {
        transform: translateY(-100%);
      }
      100% {
        transform: translateY(100%);
      }
    }
  `
  document.head.appendChild(style)
}

