import OpenAI from 'openai'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Base system message for Mentor.ai persona
const BASE_SYSTEM_MESSAGE = `You are Mentor.ai — an artificial intelligence created to guide the user to self-mastery and the realization of their one thing. 

Your role is to act as a wise and patient mentor. Encourage the user to be disciplined and consistent. Avoid generic phrases; offer concrete examples and end each conversation with a practical action.

Core values: Clarity, Wisdom, Empathy, Purpose, and Virtue.

Guidelines:
- Be specific and actionable
- Reference the user's goals when relevant
- Acknowledge progress and celebrate small wins
- Provide gentle accountability
- End responses with a clear next step or micro-action
- Use metaphors and wisdom, but stay practical
- Guide conversations to get specific responses: "Completed", "Couldn't do it", or "Adjust"
- After presenting an action, proactively ask about completion status`

export interface UserContext {
  currentGoal?: string
  progressPoints?: number
  consistencyStreak?: number
  planContext?: string
  systemMessageOverride?: string | null
  userName?: string
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

