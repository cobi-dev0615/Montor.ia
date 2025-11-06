import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getChatCompletion } from '@/lib/openai/client'

// Helper function to detect keywords in user message
function detectKeyword(message: string): 'completed' | 'couldnt' | 'adjust' | null {
  const lowerMessage = message.toLowerCase().trim()
  
  // Check for "completed" variants
  if (
    lowerMessage === 'completed' ||
    lowerMessage === 'complete' ||
    lowerMessage === 'done' ||
    lowerMessage === 'finished' ||
    lowerMessage.startsWith('i completed') ||
    lowerMessage.startsWith('i finished') ||
    lowerMessage.startsWith('i did it')
  ) {
    return 'completed'
  }

  // Check for "couldn't do it" variants
  if (
    lowerMessage === "couldn't do it" ||
    lowerMessage === "couldn't" ||
    lowerMessage === "could not" ||
    lowerMessage === "can't" ||
    lowerMessage === "cant" ||
    lowerMessage.startsWith("i couldn't") ||
    lowerMessage.startsWith("i can't") ||
    lowerMessage.startsWith("i didn't") ||
    lowerMessage.startsWith("i failed") ||
    lowerMessage.includes("couldn't do")
  ) {
    return 'couldnt'
  }

  // Check for "adjust" variants
  if (
    lowerMessage === 'adjust' ||
    lowerMessage === 'change' ||
    lowerMessage === 'modify' ||
    lowerMessage.startsWith('i need to adjust') ||
    lowerMessage.startsWith('can you adjust') ||
    lowerMessage.startsWith('please adjust') ||
    lowerMessage.includes('adjust the')
  ) {
    return 'adjust'
  }

  return null
}

export async function POST(request: NextRequest) {
  try {
    const { message, goalId: goalIdParam } = await request.json()
    let goalId = goalIdParam

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Get Supabase client
    const supabase = await createSupabaseServerClient()

    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user context (progress, streak, name)
    const { data: userData } = await supabase
      .from('users')
      .select('total_progress, consistency_streak, full_name')
      .eq('id', user.id)
      .single()

    const userName = userData?.full_name || 'there'

    // Get goal and plan details - check all user goals if no goalId provided
    let currentGoal: string | undefined
    let planContext: any = null
    let currentAction: any = null
    let currentMilestone: any = null
    let userGoalsStatus: any = null
    let systemMessageOverride: string | null = null

    // If no goalId provided, check all user goals to understand their status
    if (!goalId) {
      const { data: allGoals } = await supabase
        .from('goals')
        .select('id, title, main_goal, status')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (allGoals && allGoals.length > 0) {
        // Check which goals have plans (milestones)
        const goalsWithPlans: any[] = []
        const goalsWithoutPlans: any[] = []

        for (const goal of allGoals) {
          const { data: milestones } = await supabase
            .from('milestones')
            .select('id')
            .eq('goal_id', goal.id)
            .eq('is_deleted', false)
            .limit(1)

          if (milestones && milestones.length > 0) {
            goalsWithPlans.push(goal)
          } else {
            goalsWithoutPlans.push(goal)
          }
        }

        userGoalsStatus = {
          totalGoals: allGoals.length,
          goalsWithPlans: goalsWithPlans.length,
          goalsWithoutPlans: goalsWithoutPlans.length,
          goalsWithoutPlansList: goalsWithoutPlans.map(g => ({ id: g.id, title: g.title, main_goal: g.main_goal })),
        }

        // If user has goals but no plans, prompt them to create a plan
        if (goalsWithoutPlans.length > 0 && goalsWithPlans.length === 0) {
          systemMessageOverride = `O usuário tem ${goalsWithoutPlans.length} meta(s) ativa(s) mas ainda não criou um plano.

IMPORTANTE: Sua resposta DEVE estar em PORTUGUÊS BRASILEIRO e:
1. Reconhecer a(s) meta(s) dele(s): ${goalsWithoutPlans.map(g => `"${g.title}" - ${g.main_goal}`).join(', ')}
2. Explicar que para fazer progresso, eles precisam criar um plano estruturado
3. Direcioná-los para a página de Metas: "Por favor, vá para a página de Metas e clique em 'Gerar Plano com Mentor' para sua(s) meta(s). Isso criará um plano passo a passo para ajudá-lo a alcançar sua meta."
4. Ser encorajador e solidário
5. Manter sua resposta concisa (máximo de 3-4 frases)

NÃO se envolva em conversa geral. Foque APENAS em guiá-los para criar um plano.`
        } else if (goalsWithPlans.length > 0) {
          // User has plans - use the first goal with a plan
          const goalWithPlan = goalsWithPlans[0]
          goalId = goalWithPlan.id
        }
      } else {
        // User has no goals at all
        systemMessageOverride = `O usuário ainda não tem nenhuma meta ativa.

IMPORTANTE: Sua resposta DEVE estar em PORTUGUÊS BRASILEIRO e:
1. Perguntar o que eles gostariam de alcançar
2. Incentivá-los a criar uma meta na página de Metas
3. Explicar que você os ajudará a criar um plano assim que definirem uma meta
4. Ser caloroso e motivador
5. Manter sua resposta concisa (máximo de 3-4 frases)

NÃO se envolva em conversa geral. Foque em ajudá-los a começar com a definição de metas.`
      }
    }

    // If goalId is available (from parameter or from goalsWithPlans), fetch plan details
    if (goalId) {
      const { data: goal } = await supabase
        .from('goals')
        .select('*')
        .eq('id', goalId)
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .single()

      if (goal) {
        currentGoal = goal.main_goal

        // Get milestones
        const { data: milestones } = await supabase
          .from('milestones')
          .select('*')
          .eq('goal_id', goal.id)
          .eq('is_deleted', false)
          .order('order_index', { ascending: true })

        // Get pending actions (prioritize first pending action)
        if (milestones && milestones.length > 0) {
          for (const milestone of milestones) {
            const { data: actions } = await supabase
              .from('actions')
              .select('*')
              .eq('milestone_id', milestone.id)
              .eq('status', 'pending')
              .eq('is_deleted', false)
              .order('created_at', { ascending: true })
              .limit(1)

            if (actions && actions.length > 0) {
              currentAction = actions[0]
              currentMilestone = milestone
              break
            }
          }

          // Calculate progress statistics
          const totalMilestones = milestones.length
          const completedMilestones = milestones.filter(m => m.status === 'completed').length
          
          // Get all actions for all milestones
          const allActionsPromises = milestones.map(async (m) => {
            const { count: total } = await supabase
              .from('actions')
              .select('*', { count: 'exact', head: true })
              .eq('milestone_id', m.id)
              .eq('is_deleted', false)
            
            const { count: completed } = await supabase
              .from('actions')
              .select('*', { count: 'exact', head: true })
              .eq('milestone_id', m.id)
              .eq('status', 'completed')
              .eq('is_deleted', false)
            
            return { total: total || 0, completed: completed || 0 }
          })
          
          const allActionsResults = await Promise.all(allActionsPromises)
          const totalActionsCount = allActionsResults.reduce((acc, r) => acc + r.total, 0)
          const completedActionsCount = allActionsResults.reduce((acc, r) => acc + r.completed, 0)

          planContext = {
            milestones: milestones.map(m => ({
              title: m.title,
              description: m.description,
              status: m.status,
              order: m.order_index,
            })),
            currentMilestone: currentMilestone ? {
              title: currentMilestone.title,
              description: currentMilestone.description,
            } : null,
            currentAction: currentAction ? {
              title: currentAction.title,
              description: currentAction.description,
            } : null,
            progress: {
              milestonesCompleted: completedMilestones,
              totalMilestones,
              actionsCompleted: completedActionsCount,
              totalActions: totalActionsCount,
            },
          }
        } else {
          // Goal exists but no plan yet
          systemMessageOverride = `O usuário tem uma meta "${goal.title}" (${goal.main_goal}) mas ainda não criou um plano.

IMPORTANTE: Sua resposta DEVE estar em PORTUGUÊS BRASILEIRO e:
1. Reconhecer a meta deles: "${goal.title}" - ${goal.main_goal}
2. Explicar que para fazer progresso, eles precisam criar um plano estruturado
3. Direcioná-los: "Por favor, vá para a página de Metas, selecione sua meta '${goal.title}' e clique em 'Gerar Plano com Mentor'. Isso criará um plano passo a passo para ajudá-lo a alcançar sua meta."
4. Ser encorajador e solidário
5. Manter sua resposta concisa (máximo de 3-4 frases)

NÃO se envolva em conversa geral. Foque APENAS em guiá-los para criar um plano.`
        }
      }
    }

    // Detect keyword before processing
    const keyword = detectKeyword(message)
    let progressLogResult: any = null

    // Handle keyword-based actions BEFORE saving message
    if (keyword === 'completed' && goalId && currentAction) {
      // Log progress (internal API call)
      try {
        const progressRequest = new NextRequest(new URL('/api/progress', request.url), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action_id: currentAction.id,
            milestone_id: currentMilestone?.id,
            goal_id: goalId,
            progress_type: 'action',
            points_earned: 5,
          }),
        })

        // Import and call progress route handler
        const { POST: progressHandler } = await import('@/app/api/progress/route')
        const progressResponse = await progressHandler(progressRequest)
        
        if (progressResponse.ok) {
          progressLogResult = await progressResponse.json()
        }
      } catch (progressError) {
        console.error('Error logging progress:', progressError)
        // Continue even if progress logging fails
      }

      // Set system message override for completion
      systemMessageOverride = `O usuário acabou de completar com sucesso a ação de hoje: "${currentAction.title}".

SUA RESPOSTA (em PORTUGUÊS BRASILEIRO):
1. Celebre a conquista deles calorosamente e genuinamente: "Isso é fantástico! Você conseguiu!"
2. Reconheça o progresso deles: "Você está fazendo um ótimo progresso em direção à sua meta"
3. Se houver uma próxima ação, apresente-a naturalmente: "Ótimo trabalho! Agora, para seu próximo passo: [próxima ação]"
4. Seja encorajador e solidário
5. Mantenha conversacional (3-4 frases)

IMPORTANTE: 
- Seja genuinamente comemorativo - este é um momento de conquista
- Não se apresse para a próxima ação - deixe-os sentir a realização
- Se apresentar a próxima ação, faça naturalmente: "Quando estiver pronto, seu próximo passo é..."
- Termine com encorajamento, não com um comando`
    } else if (keyword === 'couldnt' && goalId) {
      // Update action status to reflect postponement
      if (currentAction) {
        // We could mark it as skipped or leave it pending for later
        // For now, we'll leave it pending but log the attempt
        try {
          await supabase
            .from('progress_logs')
            .insert({
              user_id: user.id,
              action_id: currentAction.id,
              milestone_id: currentMilestone?.id || null,
              goal_id: goalId,
              progress_type: 'action',
              points_earned: 0, // No points for couldn't do it
              is_deleted: false,
            })
        } catch (err) {
          console.error('Error logging action attempt:', err)
        }
      }

      // Set system message override for couldn't do it
      systemMessageOverride = `O usuário não conseguiu completar a ação: "${currentAction?.title || 'a ação'}".

SUA RESPOSTA (em PORTUGUÊS BRASILEIRO):
1. Responda com empatia e compreensão: "Tudo bem, vamos descobrir o que aconteceu"
2. Pergunte gentilmente: "O que tornou difícil para você?" ou "Que obstáculos você enfrentou?"
3. Ouça e compreenda - não julgue
4. Após entender, sugira uma abordagem mais simples ou alternativa naturalmente
5. Seja encorajador: "Vamos tentar uma abordagem diferente que funcione melhor para você"
6. Mantenha solidário e conversacional (4-5 frases)

IMPORTANTE:
- Seja compassivo e não julgue
- Foque em entender, não em culpar
- Ajude-os a encontrar um caminho que funcione para eles
- Proponha alternativas naturalmente, não como comandos
- Termine com encorajamento e uma sugestão gentil, não uma diretiva`
    } else if (keyword === 'adjust' && goalId) {
      // Set system message override for adjust
      systemMessageOverride = `O usuário quer ajustar a ação: "${currentAction?.title || 'a ação'}".

SUA RESPOSTA (em PORTUGUÊS BRASILEIRO):
1. Reconheça a solicitação deles: "Claro, vamos ajustar para funcionar melhor para você"
2. Faça 1-2 perguntas esclarecedoras naturalmente:
   - "O que especificamente precisa mudar? (tempo, dificuldade, horário)"
   - "O que funcionaria melhor para sua situação?"
3. Ouça a resposta deles, depois proponha uma ação ajustada que:
   - Permaneça alinhada com a meta deles: "${currentGoal}"
   - Se ajuste à situação atual deles
   - Ainda seja alcançável
4. Apresente conversacionalmente: "Que tal tentarmos isso em vez disso: [ação ajustada]"
5. Peça a opinião deles: "Isso funciona melhor para você?" ou "O que você acha?"

IMPORTANTE:
- Seja colaborativo, não diretivo
- Trabalhe COM eles para encontrar o ajuste certo
- Apresente a ação ajustada como uma sugestão, não um comando
- Mantenha conversacional e solidário (4-5 frases)
- Certifique-se de que eles se sintam ouvidos e envolvidos no processo`
    }

    // Save user message to database
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        user_id: user.id,
        goal_id: goalId || null,
        role: 'user',
        content: message,
        is_deleted: false,
      })

    if (messageError) {
      console.error('Error saving user message:', messageError)
      // Continue even if message save fails
    }

    // Get recent message history (last 10 messages for context)
    // RLS policy automatically filters out deleted messages (is_deleted = FALSE)
    const { data: recentMessages } = await supabase
      .from('messages')
      .select('role, content, created_at')
      .eq('user_id', user.id)
      .eq('goal_id', goalId || null)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(10)

    // Count conversation turns (user messages) to detect when to refocus
    const userMessageCount = (recentMessages || []).filter(m => m.role === 'user').length

    // Reverse to get chronological order
    const messageHistory = (recentMessages || [])
      .reverse()
      .map((m) => ({ 
        role: m.role as 'user' | 'assistant' | 'system', 
        content: m.content 
      }))

    // Build plan context string for OpenAI
    let planContextString = ''
    if (planContext && planContext.currentAction) {
      const shouldAskForStatus = userMessageCount >= 3 && !keyword
      const progressPercent = planContext.progress.totalActions > 0 
        ? Math.round((planContext.progress.actionsCompleted / planContext.progress.totalActions) * 100)
        : 0
      
      planContextString = `\n\nCurrent Plan Context:
- Goal: "${currentGoal}"
- Progress: ${planContext.progress.milestonesCompleted}/${planContext.progress.totalMilestones} milestones completed, ${planContext.progress.actionsCompleted}/${planContext.progress.totalActions} actions completed (${progressPercent}%)
- Current Milestone: "${planContext.currentMilestone?.title}"
- Today's Action: "${planContext.currentAction.title}"
${planContext.currentAction.description ? `- Action Description: ${planContext.currentAction.description}` : ''}
- Conversation turns: ${userMessageCount}

Your role is to NATURALLY guide the user toward completing this action. Be supportive, helpful, and conversational. Only check completion status after having a meaningful conversation about the action.`

      // If no keyword detected but we have a plan, guide the conversation naturally
      if (!keyword && planContext.currentAction && !systemMessageOverride) {
        // Determine conversation stage based on message count
        const conversationStage = userMessageCount <= 1 ? 'initial' : 
                                 userMessageCount <= 4 ? 'guiding' : 
                                 userMessageCount <= 7 ? 'checking' : 'evaluating'
        
        if (conversationStage === 'initial') {
          systemMessageOverride = `Você é um mentor solidário e orientado a metas ajudando o usuário a trabalhar em direção à sua meta: "${currentGoal}".

SITUAÇÃO ATUAL:
- Progresso do usuário: ${progressPercent}% completo (${planContext.progress.actionsCompleted}/${planContext.progress.totalActions} ações concluídas)
- Marco atual: "${planContext.currentMilestone?.title}"
- Ação de hoje: "${planContext.currentAction.title}"

SUA ABORDAGEM (em PORTUGUÊS BRASILEIRO):
1. Comece reconhecendo calorosamente o progresso deles: "Você está ${progressPercent}% do caminho - esse é um progresso maravilhoso!"
2. Apresente a ação de hoje naturalmente: "Hoje, vamos focar em: ${planContext.currentAction.title}"
3. Pergunte se eles entendem o que essa ação envolve ou se precisam de esclarecimentos
4. Seja conversacional e solidário - esta é a PRIMEIRA troca sobre esta ação
5. Mantenha sua resposta em 3-4 frases
6. Termine com uma pergunta aberta como: "Essa ação faz sentido para você?" ou "Que perguntas você tem sobre como começar?"

IMPORTANTE: 
- NÃO pergunte sobre o status de conclusão ainda - estamos apenas começando
- NÃO se apresse para avaliação
- Foque em compreensão e preparação
- Seja caloroso, encorajador e natural`
        } else if (conversationStage === 'guiding') {
          systemMessageOverride = `Você é um mentor solidário guiando o usuário através de sua ação: "${planContext.currentAction.title}".

CONTEXTO:
- Meta: "${currentGoal}"
- Progresso: ${progressPercent}% completo
- Marco atual: "${planContext.currentMilestone?.title}"
- Ação: "${planContext.currentAction.title}"

SEU PAPEL (em PORTUGUÊS BRASILEIRO):
1. Ajude o usuário a entender COMO fazer esta ação
2. Se eles parecerem confusos ou não familiarizados, explique a ação passo a passo
3. Ofereça encorajamento e aborde quaisquer preocupações ou obstáculos
4. Sugira dicas práticas ou estratégias se relevante
5. Mantenha a conversa natural e fluida
6. Seja paciente e solidário

ESTILO DE CONVERSA:
- Faça perguntas para entender a situação deles: "Qual é sua situação atual?" ou "O que pode tornar isso desafiador para você?"
- Forneça orientação: "Aqui está como você pode abordar isso..."
- Ofereça apoio: "Lembre-se, cada pequeno passo conta em direção à sua meta"
- Aborde preocupações: "Se você está preocupado com X, podemos ajustar..."

IMPORTANTE:
- NÃO pergunte sobre conclusão ainda - continue guiando e apoiando
- Foque em ajudá-los a SE PREPARAR e ENTENDER
- Apenas verifique o status depois que eles tiverem a chance de realmente tentar a ação (após 5+ trocas)
- Seja conversacional, não avaliativo`
        } else if (conversationStage === 'checking') {
          systemMessageOverride = `Você é um mentor solidário verificando o progresso do usuário com: "${planContext.currentAction.title}".

CONTEXTO:
- Meta: "${currentGoal}"
- Progresso: ${progressPercent}% completo
- Eles têm discutido esta ação por várias trocas

SUA ABORDAGEM (em PORTUGUÊS BRASILEIRO):
1. Verifique naturalmente: "Como está indo com [ação]?" ou "Você teve a chance de trabalhar em [ação]?"
2. Se eles não começaram, ajude-os a começar: "Vamos dividir em passos menores..."
3. Se eles estão com dificuldades, ofereça apoio: "O que está tornando difícil? Vamos trabalhar juntos nisso."
4. Seja compreensivo e não julgue
5. Mantenha respostas conversacionais (3-4 frases)

IMPORTANTE:
- Ainda seja solidário, não avaliativo
- Ajude-os a superar obstáculos
- Apenas mude para o status de conclusão se eles indicarem que tentaram
- Guie naturalmente em direção ao progresso, não se apresse para avaliação`
        } else {
          // evaluating stage - only after 7+ exchanges
          systemMessageOverride = `Você é um mentor solidário ajudando o usuário com sua ação: "${planContext.currentAction.title}".

CONTEXTO:
- Meta: "${currentGoal}"
- Progresso: ${progressPercent}% completo
- Vocês têm discutido esta ação por um tempo

SUA ABORDAGEM (em PORTUGUÊS BRASILEIRO):
1. Verifique gentilmente o status de conclusão: "Você teve a chance de completar [ação]? Você pode dizer 'Concluído', 'Não consegui fazer' ou 'Ajustar' se precisar modificá-la."
2. Seja compreensivo se eles não completaram
3. Ofereça ajuda para ajustar se necessário
4. Mantenha solidário, não insistente

IMPORTANTE:
- Seja gentil e compreensivo
- Permita que eles digam que não conseguiram fazer sem julgamento
- Ajude-os a ajustar se necessário
- Continue sendo solidário`
        }
      }
    }

    // Get AI response from OpenAI with plan context
    const aiResponse = await getChatCompletion(
      messageHistory,
      {
        currentGoal,
        progressPoints: userData?.total_progress || 0,
        consistencyStreak: userData?.consistency_streak || 0,
        planContext: planContextString,
        systemMessageOverride,
        userName,
      }
    )

    if (!aiResponse) {
      return NextResponse.json(
        { error: 'Failed to get AI response' },
        { status: 500 }
      )
    }

    // Save AI response to database
    const { error: aiMessageError } = await supabase
      .from('messages')
      .insert({
        user_id: user.id,
        goal_id: goalId || null,
        role: 'assistant',
        content: aiResponse,
      })

    if (aiMessageError) {
      console.error('Error saving AI message:', aiMessageError)
      // Continue even if message save fails
    }

    return NextResponse.json({ 
      response: aiResponse,
      success: true,
      progressUpdate: progressLogResult ? {
        total_progress: progressLogResult.userProgress?.total_progress,
        consistency_streak: progressLogResult.userProgress?.consistency_streak,
        avatar_level: progressLogResult.userProgress?.avatar_level,
        avatar_stage: progressLogResult.userProgress?.avatar_stage,
        avatarEvolved: progressLogResult.avatarEvolved,
        pointsEarned: 5,
      } : null,
      keywordDetected: keyword,
    })
  } catch (error: any) {
    console.error('Chat API error:', error)
    
    // Handle OpenAI API errors
    if (error instanceof Error && error.message.includes('API key')) {
      return NextResponse.json(
        { error: 'Chave da API OpenAI não configurada' },
        { status: 500 }
      )
    }

    // Handle geographic restriction error
    if (error?.code === 'unsupported_country_region_territory' || 
        error?.error?.code === 'unsupported_country_region_territory' ||
        (error instanceof Error && error.message.includes('Country, region, or territory not supported'))) {
      return NextResponse.json(
        { 
          error: 'Serviço não disponível na sua região. A API da OpenAI não está disponível no seu país ou região no momento. Por favor, entre em contato com o suporte para mais informações.' 
        },
        { status: 403 }
      )
    }

    // Handle other OpenAI API errors
    if (error?.status === 403 || error?.status === 429 || error?.status === 401) {
      return NextResponse.json(
        { 
          error: error?.error?.message || error?.message || 'Erro ao acessar o serviço de IA. Por favor, tente novamente mais tarde.' 
        },
        { status: error.status || 500 }
      )
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor. Por favor, tente novamente mais tarde.', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}

