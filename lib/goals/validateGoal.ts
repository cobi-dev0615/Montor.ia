import { getChatCompletion, ChatMessage } from '@/lib/openai/client'

export interface GoalValidationResult {
  isValid: boolean
  reason?: string
}

/**
 * Validates if a goal is realistic and achievable using AI
 * @param title - Goal title
 * @param mainGoal - Main goal description
 * @param description - Optional description
 * @returns Validation result with isValid flag and optional reason
 */
export async function validateGoal(
  title: string,
  mainGoal: string,
  description?: string | null
): Promise<GoalValidationResult> {
  try {
    const validationPrompt = `Você é um validador de metas. Analise se a seguinte meta é realista e alcançável para um ser humano.

CRITÉRIOS DE VALIDAÇÃO:
- A meta deve ser fisicamente possível (não violar leis da física)
- A meta deve ser alcançável por um ser humano normal
- A meta não deve ser claramente impossível ou absurda
- Metas desafiadoras mas possíveis são válidas (ex: correr maratona, aprender idiomas, criar empresa)

Título: ${title}
Meta Principal: ${mainGoal}
${description ? `Descrição: ${description}` : ''}

IMPORTANTE: Responda APENAS com um JSON válido no formato exato:
{
  "isValid": true ou false,
  "reason": "razão breve em português brasileiro (obrigatório apenas se isValid for false)"
}

EXEMPLOS:
- Meta impossível: "Voar sem asas" → {"isValid": false, "reason": "Voar sem equipamento não é fisicamente possível para humanos."}
- Meta possível: "Correr uma maratona" → {"isValid": true}
- Meta possível: "Aprender 5 idiomas" → {"isValid": true}
- Meta impossível: "Ser imortal" → {"isValid": false, "reason": "A imortalidade não é alcançável para seres humanos."}`

    const messages: ChatMessage[] = [
      {
        role: 'user',
        content: validationPrompt,
      },
    ]

    const response = await getChatCompletion(messages, undefined, {
      maxTokens: 200,
      jsonMode: true,
    })

    if (!response) {
      // If validation fails, default to allowing the goal (fail open)
      console.warn('Goal validation API returned no response, allowing goal creation')
      return { isValid: true }
    }

    try {
      const parsed = JSON.parse(response)
      return {
        isValid: parsed.isValid === true,
        reason: parsed.reason || undefined,
      }
    } catch (parseError) {
      console.error('Error parsing validation response:', parseError)
      // Fail open - allow goal creation if we can't parse the response
      return { isValid: true }
    }
  } catch (error) {
    console.error('Error validating goal:', error)
    // Fail open - allow goal creation if validation service fails
    return { isValid: true }
  }
}

