import { format } from 'date-fns'

interface MessageItemProps {
  message: {
    role: 'user' | 'assistant' | 'system'
    content: string
    created_at: string
  }
  userName?: string | null
}

export function MessageItem({ message, userName }: MessageItemProps) {
  const isUser = message.role === 'user'

  // User avatar SVG component - Realistic human head avatar
  const UserAvatar = () => (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00d4ff] to-[#0099ff] flex items-center justify-center flex-shrink-0 border-2 border-[rgba(0,212,255,0.5)] shadow-[0_0_10px_rgba(0,212,255,0.3)] overflow-hidden">
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background circle with gradient */}
        <defs>
          <linearGradient id="avatarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00d4ff" />
            <stop offset="100%" stopColor="#0099ff" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#avatarGradient)" />
        
        {/* Head shape - more oval/realistic */}
        <ellipse cx="50" cy="38" rx="16" ry="18" fill="#f4d1ae" />
        
        {/* Hair - more natural style */}
        <path
          d="M 34 25 Q 34 18 42 18 Q 50 16 58 18 Q 66 18 66 25 Q 66 22 62 22 Q 58 20 50 20 Q 42 20 38 22 Q 34 22 34 25 Z"
          fill="#2c1810"
        />
        <path
          d="M 34 25 Q 36 28 40 28 Q 44 26 50 26 Q 56 26 60 28 Q 64 28 66 25"
          fill="#2c1810"
        />
        
        {/* Neck */}
        <ellipse cx="50" cy="58" rx="6" ry="8" fill="#f4d1ae" />
        
        {/* Shoulders/Upper body */}
        <path
          d="M 30 60 Q 30 55 50 55 Q 70 55 70 60 L 70 75 Q 70 80 50 80 Q 30 80 30 75 Z"
          fill="#ffffff"
        />
        
        {/* Left shoulder */}
        <ellipse cx="25" cy="62" rx="6" ry="5" fill="#ffffff" />
        
        {/* Right shoulder */}
        <ellipse cx="75" cy="62" rx="6" ry="5" fill="#ffffff" />
        
        {/* Face details - Eyes with highlights */}
        <ellipse cx="44" cy="33" rx="3" ry="2.5" fill="#ffffff" />
        <ellipse cx="56" cy="33" rx="3" ry="2.5" fill="#ffffff" />
        <circle cx="44" cy="33" r="1.5" fill="#1a1a1a" />
        <circle cx="56" cy="33" r="1.5" fill="#1a1a1a" />
        <circle cx="45" cy="32.5" r="0.8" fill="#ffffff" />
        <circle cx="57" cy="32.5" r="0.8" fill="#ffffff" />
        
        {/* Eyebrows */}
        <path
          d="M 40 30 Q 44 28 48 30"
          stroke="#2c1810"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 52 30 Q 56 28 60 30"
          stroke="#2c1810"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
        
        {/* Nose */}
        <path
          d="M 50 36 Q 48 40 50 42 Q 52 40 50 36"
          stroke="#d4a574"
          strokeWidth="1"
          fill="none"
        />
        
        {/* Mouth - natural smile */}
        <path
          d="M 45 42 Q 50 45 55 42"
          stroke="#8b4513"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        
        {/* Ears */}
        <ellipse cx="34" cy="38" rx="2.5" ry="4" fill="#f4d1ae" />
        <ellipse cx="66" cy="38" rx="2.5" ry="4" fill="#f4d1ae" />
      </svg>
    </div>
  )

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex gap-3 max-w-[70%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {isUser ? (
          <UserAvatar />
        ) : (
          <div className="w-8 h-8 rounded-full bg-[rgba(0,212,255,0.2)] border border-[rgba(0,212,255,0.5)] flex items-center justify-center flex-shrink-0 shadow-[0_0_10px_rgba(0,212,255,0.2)]">
            <span className="text-sm">🤖</span>
          </div>
        )}
        <div className="flex flex-col">
          <div
            className={`rounded-2xl px-4 py-2 ${
              isUser
                ? 'bg-gradient-to-br from-[#00d4ff] to-[#0099ff] text-white shadow-[0_0_15px_rgba(0,212,255,0.3)]'
                : 'bg-[rgba(55,65,81,0.8)] text-gray-100 border border-[rgba(0,212,255,0.2)]'
            }`}
          >
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          </div>
          <span className={`text-xs text-gray-500 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
            {format(new Date(message.created_at), 'HH:mm')}
          </span>
        </div>
      </div>
    </div>
  )
}
