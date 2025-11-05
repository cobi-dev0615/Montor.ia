'use client'

interface CinematicOverlayProps {
  intensity?: number
}

export function CinematicOverlay({ intensity = 0.4 }: CinematicOverlayProps) {
  return (
    <>
      {/* Vignette effect */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: `
            radial-gradient(
              ellipse at center,
              transparent 0%,
              transparent 40%,
              rgba(0, 0, 0, ${intensity}) 100%
            )
          `,
        }}
      />
      
      {/* Soft texture overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(255, 255, 255, 0.01) 2px,
              rgba(255, 255, 255, 0.01) 4px
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 2px,
              rgba(255, 255, 255, 0.01) 2px,
              rgba(255, 255, 255, 0.01) 4px
            )
          `,
          opacity: 0.3,
          mixBlendMode: 'overlay',
        }}
      />
      
      {/* Color grading overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: `
            linear-gradient(135deg, 
              rgba(255, 107, 53, ${intensity * 0.1}) 0%,
              transparent 30%,
              transparent 70%,
              rgba(0, 212, 255, ${intensity * 0.1}) 100%
            )
          `,
          mixBlendMode: 'color-dodge',
        }}
      />
    </>
  )
}

