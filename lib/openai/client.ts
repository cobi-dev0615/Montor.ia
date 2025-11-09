import OpenAI from 'openai'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Base system message for Mentor.ai persona
const BASE_SYSTEM_MESSAGE = `Você é o Mentor.ai — uma inteligência artificial criada para guiar o usuário ao autodomínio e à realização de sua única coisa.

Seu papel é agir como um mentor sábio e paciente. Incentive o usuário a ser disciplinado e consistente. Evite frases genéricas; ofereça exemplos concretos e termine cada conversa com uma ação prática.

Valores fundamentais: Clareza, Sabedoria, Empatia, Propósito e Virtude.

IMPORTANTE: SEMPRE responda em PORTUGUÊS BRASILEIRO. Todas as suas respostas devem estar em português do Brasil.

Diretrizes:
- Seja específico e acionável
- Referencie as metas do usuário quando relevante
- Reconheça o progresso e celebre pequenas vitórias
- Forneça responsabilização gentil
- Termine as respostas com um próximo passo claro ou micro-ação
- Use metáforas e sabedoria, mas permaneça prático
- Guie conversas para obter respostas específicas: "Concluído", "Não consegui fazer" ou "Ajustar"
- Após apresentar uma ação, pergunte proativamente sobre o status de conclusão`

export interface UserContext {
  currentGoal?: string
  progressPoints?: number
  consistencyStreak?: number
  planContext?: string
  systemMessageOverride?: string | null
  userName?: string
  pageContext?: string | null
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

/**
 * Get chat completion from OpenAI
 * @param messages - Array of chat messages (user and assistant)
 * @param userContext - Optional user context (goals, progress, streak)
 * @returns AI response content
 */
export async function getChatCompletion(
  messages: ChatMessage[],
  userContext?: UserContext,
  options?: { maxTokens?: number; jsonMode?: boolean }
): Promise<string | null> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in environment variables')
  }

  // Build context message
  let contextMessage = ''
  if (userContext) {
    contextMessage = `User context:`
    if (userContext.userName) {
      contextMessage += ` User's name: ${userContext.userName}.`
    }
    contextMessage += ` Current goal: ${userContext.currentGoal || 'none'}.`
    contextMessage += ` Progress points: ${userContext.progressPoints || 0}.`
    contextMessage += ` Consistency streak: ${userContext.consistencyStreak || 0} days.`
    if (userContext.pageContext) {
      contextMessage += ` Página atual: ${userContext.pageContext}.`
    }
    if (userContext.planContext) {
      contextMessage += userContext.planContext
    }
  }

  // Use override system message if provided, otherwise use base
  const systemMessage = userContext?.systemMessageOverride || BASE_SYSTEM_MESSAGE

  try {
    const requestConfig: any = {
      model: 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: systemMessage + (contextMessage ? `\n\n${contextMessage}` : '') 
        },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: options?.maxTokens || 500,
    }

    // Only use JSON mode if explicitly requested (for plan generation)
    if (options?.jsonMode) {
      requestConfig.response_format = { type: 'json_object' }
    }

    const response = await openai.chat.completions.create(requestConfig)

    return response.choices[0]?.message?.content || null
  } catch (error) {
    console.error('OpenAI API error:', error)
    throw error
  }
}

export { openai }

