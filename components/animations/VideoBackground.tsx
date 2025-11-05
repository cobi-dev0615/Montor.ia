'use client'

import { useEffect, useRef, useState } from 'react'

interface VideoBackgroundProps {
  videoUrl?: string
  fallbackGradient?: boolean
}

export function VideoBackground({
  videoUrl,
  fallbackGradient = true,
}: VideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Try to play video
    video.play().catch(() => {
      setHasError(true)
    })

    // Loop video
    video.addEventListener('ended', () => {
      video.currentTime = 0
      video.play()
    })
  }, [])

  // If no video URL provided or error, use animated gradient fallback
  if (!videoUrl || hasError) {
    return (
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: `
            linear-gradient(135deg, 
              rgba(255, 107, 53, 0.15) 0%,
              rgba(0, 212, 255, 0.15) 25%,
              rgba(255, 0, 255, 0.15) 50%,
              rgba(0, 153, 255, 0.15) 75%,
              rgba(255, 107, 53, 0.15) 100%
            )
          `,
          backgroundSize: '400% 400%',
          animation: 'gradientShift 15s ease infinite',
          filter: 'blur(40px)',
        }}
      />
    )
  }

  return (
    <>
      <video
        ref={videoRef}
        className="fixed inset-0 w-full h-full object-cover pointer-events-none z-0"
        style={{
          opacity: 0.08,
          filter: 'blur(20px) saturate(150%)',
        }}
        muted
        loop
        playsInline
        autoPlay
      >
        <source src={videoUrl} type="video/mp4" />
      </video>
      {/* Overlay for better integration */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: `
            radial-gradient(circle at 20% 50%, rgba(255, 107, 53, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 50%, rgba(0, 212, 255, 0.1) 0%, transparent 50%)
          `,
        }}
      />
    </>
  )
}

// Add CSS animation for gradient fallback
if (typeof document !== 'undefined' && !document.getElementById('video-gradient-style')) {
  const style = document.createElement('style')
  style.id = 'video-gradient-style'
  style.textContent = `
    @keyframes gradientShift {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
  `
  document.head.appendChild(style)
}

