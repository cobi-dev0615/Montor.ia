'use client'

import { useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { MessageCircle, X } from 'lucide-react'
import { ChatInterface } from './ChatInterface'

const PAGE_CONTEXT_LABELS: Record<string, string> = {
  '/dashboard': 'Painel Principal',
  '/goals': 'Metas',
  '/progress': 'Progresso',
  '/settings': 'Configurações',
}

function resolveContext(pathname: string) {
  if (!pathname) return 'Navegação Geral'
  if (pathname === '/chat') return 'Sessão de Chat'

  const directMatch = PAGE_CONTEXT_LABELS[pathname]
  if (directMatch) return directMatch

  const match = Object.keys(PAGE_CONTEXT_LABELS).find((key) =>
    pathname.startsWith(key)
  )

  return match ? PAGE_CONTEXT_LABELS[match] : `Contexto: ${pathname}`
}

export function MentorDock() {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(true)

  const pageContext = useMemo(() => resolveContext(pathname || ''), [pathname])

  if (pathname === '/chat') {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-3">
      {isCollapsed ? (
        <button
          onClick={() => setIsCollapsed(false)}
          className="w-12 h-12 rounded-full bg-[rgba(12,20,36,0.9)] border border-[rgba(0,212,255,0.4)] shadow-[0_0_18px_rgba(0,212,255,0.35)] flex items-center justify-center text-gray-100 hover:bg-[rgba(20,36,60,0.95)] transition"
          aria-expanded="false"
          aria-label="Abrir conversa com o Mentor"
        >
          <MessageCircle className="w-5 h-5 text-[#00d4ff]" />
        </button>
      ) : (
        <div className="relative w-[320px] md:w-[360px] h-[420px] bg-[rgba(10,18,32,0.95)] border border-[rgba(0,212,255,0.35)] rounded-2xl shadow-[0_0_25px_rgba(0,212,255,0.35)] overflow-hidden">
          <header className="flex items-center justify-between px-4 py-3 border-b border-[rgba(0,212,255,0.25)] bg-[rgba(12,20,36,0.9)]">
            <div>
              <p className="text-sm font-semibold text-[#00d4ff]">Mentor.ai</p>
              <p className="text-xs text-gray-400">{pageContext}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsCollapsed(true)}
                className="w-8 h-8 rounded-full bg-[rgba(0,212,255,0.12)] border border-[rgba(0,212,255,0.35)] text-gray-200 hover:bg-[rgba(0,212,255,0.24)] transition"
                aria-label="Fechar mentor"
              >
                <X className="w-4 h-4 mx-auto" />
              </button>
            </div>
          </header>
          <div className="h-[calc(100%-56px)]">
            <ChatInterface context={pageContext} variant="dock" />
          </div>
        </div>
      )}
    </div>
  )
}

