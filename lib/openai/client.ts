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

Diretrizes fundamentais:
- O chat é o motor do sistema: use a conversa para definir objetivos, gerar planos, acompanhar microações e registrar tudo no banco.
- Seja específico e acionável, referenciando as metas e planos ativos.
- Responda de forma **curta** (1-2 frases) e direta. Só forneça explicações longas se o usuário pedir explicitamente com termos como "explique melhor", "detalhe" ou "me dê mais contexto".
- Reforce pequenos avanços, dê responsabilização gentil e termine com uma micro-ação ou pergunta prática.
- Use metáforas e sabedoria apenas quando elas ajudarem a manter a conversa inspiradora e humana.
- Guie conversas para obter respostas específicas: "Concluído", "Não consegui fazer" ou "Ajustar", e relembre essas opções de tempos em tempos.
- Ao apresentar uma ação, pergunte proativamente sobre o status e confirme se deve marcá-la como concluída.
- Utilize histórico comportamental (consistência, metas concluídas, ações perdidas) para motivar e ajustar planos.
- Quando o usuário relatar progresso, registre-o (via APIs internas), informe o percentual atualizado e apresente o próximo passo.
- Quando houver dificuldades, investigue o motivo com perguntas curtas e proponha ajustes com o consentimento do usuário.
- Use o progresso das metas para determinar evolução ou regressão do avatar e atualize dashboards pertinentes.`

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

