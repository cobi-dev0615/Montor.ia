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
    const { message, goalId: goalIdParam, context: pageContext } = await request.json()
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
      .select('total_progress, consistency_streak, full_name, onboarding_data')
      .eq('id', user.id)
      .single()

    const userName = userData?.full_name || 'there'
    const onboardingData = (userData?.onboarding_data as Record<string, any>) || {}
    const existingChatSession = onboardingData.chatSession || null
    let chatSessionState = existingChatSession ? { ...existingChatSession } : {}

    const persistChatSession = async (session: any) => {
      chatSessionState = { ...chatSessionState, ...session }
      Object.keys(chatSessionState).forEach((key) => {
        if (chatSessionState[key] === null || chatSessionState[key] === undefined) {
          delete chatSessionState[key]
        }
      })

      const updatedOnboarding = {
        ...onboardingData,
        chatSession: Object.keys(chatSessionState).length > 0 ? chatSessionState : null,
      }

      const { error: sessionError } = await supabase
        .from('users')
        .update({ onboarding_data: updatedOnboarding })
        .eq('id', user.id)

      if (sessionError) {
        console.error('Error updating chat session state:', sessionError)
      }
    }

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
        .order('created_at', { ascending: false })

      if (allGoals && allGoals.length > 0) {
        const activeGoals = allGoals.filter(goal => goal.status === 'active')
        const goalsToEvaluate = activeGoals.length > 0 ? activeGoals : allGoals

        // Check which goals have plans (milestones)
        const goalsWithPlans: any[] = []
        const goalsWithoutPlans: any[] = []

        for (const goal of goalsToEvaluate) {
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
          totalGoals: goalsToEvaluate.length,
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

IMPORTANTE: Sua resposta DEVE estar em PORTUGUÊS BRASILEIRO e seguir estes passos:
1. Reconheça calorosamente que eles estão começando agora.
2. Informe que ele pode criar uma meta direto na página de Metas OU, se preferir, você pode guiá-lo aqui mesmo no chat.
3. Convide-o a criar junto pelo chat perguntando algo como: "Posso te fazer algumas perguntas rápidas para entender melhor sua meta?"
4. Se o usuário aceitar, siga com as perguntas na ordem: idade, objetivo principal (e peça mais detalhes se estiver vago), nível atual (iniciante/intermediário/avançado) e disponibilidade de dias por semana. Depois proponha um prazo em semanas e confirme.
5. Mantenha a resposta inicial em 3-4 frases, acolhedora, motivadora e clara sobre as duas opções.

NÃO se envolva em conversa geral fora desse contexto. Foque em ajudá-lo a definir a meta e iniciar o plano.`
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
            goalId: goal.id,
            milestones: milestones.map(m => ({
              id: m.id,
              title: m.title,
              description: m.description,
              status: m.status,
              order: m.order_index,
            })),
            currentMilestone: currentMilestone ? {
              id: currentMilestone.id,
              title: currentMilestone.title,
              description: currentMilestone.description,
              status: currentMilestone.status,
            } : null,
            currentAction: currentAction ? {
              id: currentAction.id,
              title: currentAction.title,
              description: currentAction.description,
              milestoneId: currentAction.milestone_id,
              status: currentAction.status,
            } : null,
            progress: {
              milestonesCompleted: completedMilestones,
              totalMilestones,
              actionsCompleted: completedActionsCount,
              totalActions: totalActionsCount,
            },
          }

          if (planContext.currentAction) {
            await persistChatSession({
              goalId: planContext.goalId,
              milestoneId: planContext.currentAction.milestoneId,
              actionId: planContext.currentAction.id,
              lastUpdated: new Date().toISOString(),
            })
          } else {
            await persistChatSession({
              goalId: planContext.goalId,
              milestoneId: null,
              actionId: null,
              status: 'completed',
              lastUpdated: new Date().toISOString(),
            })
          }
        } else {
          // Goal exists but no plan yet
          await persistChatSession({
            goalId: goal.id,
            milestoneId: null,
            actionId: null,
            status: 'no_plan',
            lastUpdated: new Date().toISOString(),
          })

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
    const normalizedMessage = message.toLowerCase().trim()
    const positiveConfirmations = [
      'sim',
      'claro',
      'sim, pode marcar',
      'pode marcar',
      'pode sim',
      'ok',
      'yes',
      'yeah',
      'yep',
      'sure',
      'done',
      'finished',
      'i finished',
      'i did it',
      'feito',
      'fiz',
      'concluído',
      'concluido',
      'complete',
      'terminado',
      'pronto',
      'com certeza',
    ]
    const negativeConfirmations = [
      'não',
      'nao',
      'not yet',
      'ainda não',
      'ainda nao',
      'no',
      'não ainda',
      'nao ainda',
      'não, ainda falta',
      'nao, ainda falta',
      'not really',
    ]
    const pendingCompletion = chatSessionState.pendingCompletion
    let completionConfirmed = false
    let completionPrompted = false
    let progressLogResult: any = null
    const totalActionsInContext = planContext?.progress?.totalActions ?? 0
    const completedActionsInContext = planContext?.progress?.actionsCompleted ?? 0
    const progressPercentFromContext =
      totalActionsInContext > 0
        ? Math.round((completedActionsInContext / totalActionsInContext) * 100)
        : 0

    const getProgressTone = (percent: number) => {
      if (percent <= 0) return 'starting'
      if (percent < 20) return 'early'
      if (percent < 70) return 'mid'
      if (percent < 100) return 'late'
      return 'complete'
    }
    const getProgressGuidance = (tone: string) => {
      switch (tone) {
        case 'starting':
          return 'Eles estão no início. Valide o primeiro passo e foque em torná-lo claro, simples e alcançável.'
        case 'early':
          return 'Eles deram alguns passos. Reforce o ritmo e ajude a construir confiança sem exagerar.'
        case 'mid':
          return 'Eles estão no meio do plano. Destaque o que já conquistaram e trabalhe para remover obstáculos específicos.'
        case 'late':
          return 'Eles estão próximos da conclusão. Reforce a consistência e prepare-os para finalizar com energia.'
        case 'complete':
          return 'O plano está concluído. Celebre o resultado, reconheça o esforço e explore próximos objetivos ou manutenção.'
        default:
          return 'Adapte o tom ao estágio atual: motivador, claro e realista.'
      }
    }
    const progressTone = getProgressTone(progressPercentFromContext)
    const progressGuidance = getProgressGuidance(progressTone)
    const progressSummaryText = `Progresso atual: ${progressPercentFromContext}% (${completedActionsInContext}/${totalActionsInContext} ações concluídas).`

    if (keyword === 'completed' && goalId && currentAction) {
      if (
        !pendingCompletion ||
        pendingCompletion.goalId !== goalId ||
        pendingCompletion.actionId !== currentAction.id
      ) {
        await persistChatSession({
          pendingCompletion: {
            goalId,
            actionId: currentAction.id,
          },
        })
        systemMessageOverride =
          `Parece que você finalizou "${currentAction.title}". Quer que eu marque esta ação como concluída agora?` +
          ' Responda "Sim" ou "Não".'
        completionPrompted = true
      } else {
        completionConfirmed = true
      }
    } else if (
      pendingCompletion &&
      currentAction &&
      pendingCompletion.goalId === goalId &&
      pendingCompletion.actionId === currentAction.id
    ) {
      if (positiveConfirmations.includes(normalizedMessage)) {
        completionConfirmed = true
      } else if (negativeConfirmations.includes(normalizedMessage)) {
        await persistChatSession({ pendingCompletion: null })
        systemMessageOverride =
          'Perfeito, vamos continuar trabalhando nessa ação quando você estiver pronto.'
        completionPrompted = true
      }
    }

    if (completionConfirmed && pendingCompletion) {
      await persistChatSession({ pendingCompletion: null })
    }

    // Handle keyword-based actions BEFORE saving message
    if (completionConfirmed && goalId && currentAction) {
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

      let planFullyCompleted = false

      let nextActionRecord: any = null
      let nextMilestoneForNextAction: any = null

      try {
        // Determine next action after completion
        const { data: milestoneList } = await supabase
          .from('milestones')
          .select('id')
          .eq('goal_id', goalId)
          .eq('is_deleted', false)
          .order('order_index', { ascending: true })

        if (milestoneList && milestoneList.length > 0) {
          for (const milestone of milestoneList) {
            const { data: pendingActions } = await supabase
              .from('actions')
              .select('*')
              .eq('milestone_id', milestone.id)
              .eq('status', 'pending')
              .eq('is_deleted', false)
              .order('created_at', { ascending: true })
              .limit(1)

            if (pendingActions && pendingActions.length > 0) {
              nextActionRecord = pendingActions[0]
              break
            }
          }
        }

        if (nextActionRecord) {
          await persistChatSession({
            goalId,
            milestoneId: nextActionRecord.milestone_id,
            actionId: nextActionRecord.id,
            lastUpdated: new Date().toISOString(),
          })
          
          // Get the milestone for the next action
          const { data: nextMilestone } = await supabase
            .from('milestones')
            .select('title')
            .eq('id', nextActionRecord.milestone_id)
            .eq('is_deleted', false)
            .single()
          
          nextMilestoneForNextAction = nextMilestone
          
          // Send a notification message about the new action
          const actionNotification = `🎯 **Nova Ação Disponível!**\n\n` +
            `Agora vamos trabalhar em: **"${nextActionRecord.title}"**\n` +
            (nextMilestone ? `Este é um passo importante para alcançar o marco: "${nextMilestone.title}"\n\n` : '\n') +
            `Quando você estiver pronto para começar, me avise! Posso ajudar você a entender como realizar esta ação ou responder qualquer dúvida que você tenha.`
          
          // Save the notification message
          await supabase
            .from('messages')
            .insert({
              user_id: user.id,
              goal_id: goalId,
              role: 'assistant',
              content: actionNotification,
              is_deleted: false,
            })
        } else {
          planFullyCompleted = true
          await persistChatSession({
            goalId,
            milestoneId: null,
            actionId: null,
            status: 'completed',
            lastUpdated: new Date().toISOString(),
          })

          // Get goal details before marking as completed
          const { data: completedGoal } = await supabase
            .from('goals')
            .select('title, main_goal')
            .eq('id', goalId)
            .eq('is_deleted', false)
            .single()

          // Mark goal as completed
          await supabase
            .from('goals')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
            })
            .eq('id', goalId)
            .eq('is_deleted', false)

          // Log goal completion (progress_type: goal)
          await supabase
            .from('progress_logs')
            .insert({
              user_id: user.id,
              goal_id: goalId,
              progress_type: 'goal',
              points_earned: 20,
              is_deleted: false,
            })
          
          // Send congratulatory message and encourage next goal
          const goalTitle = completedGoal?.title || 'sua meta'
          const goalMainGoal = completedGoal?.main_goal || goalTitle
          
          const congratulationMessage = `🎉 **PARABÉNS! Você Conquistou Sua Meta!** 🎉\n\n` +
            `Você completou com sucesso: **"${goalTitle}"**\n` +
            `Sua única coisa: "${goalMainGoal}"\n\n` +
            `Isso é uma conquista incrível! Você demonstrou dedicação, consistência e determinação para alcançar este objetivo. Cada passo que você deu foi importante para chegar até aqui.\n\n` +
            `**O que vem a seguir?**\n` +
            `Agora que você alcançou esta meta, que tal pensar no próximo desafio?\n\n` +
            `**Vamos criar sua próxima meta?**\n` +
            `1. Você pode criar uma nova meta diretamente na página de Metas\n` +
            `2. Ou podemos conversar aqui mesmo e eu te ajudo a definir seu próximo objetivo\n\n` +
            `Me conte: qual área da sua vida você gostaria de melhorar ou qual novo desafio você quer enfrentar agora?`
          
          // Save the congratulation message
          await supabase
            .from('messages')
            .insert({
              user_id: user.id,
              goal_id: goalId,
              role: 'assistant',
              content: congratulationMessage,
              is_deleted: false,
            })
        }
      } catch (trackingError) {
        console.error('Error updating next action after completion:', trackingError)
      }

      const completionTone = getProgressTone(
        Math.min(100, progressPercentFromContext + (planContext?.progress ? (100 / Math.max(planContext.progress.totalActions, 1)) : 0))
      )

      const completionToneGuidance =
        completionTone === 'starting'
          ? `Eles estão dando os primeiros passos. Reconheça que iniciaram a jornada e convide-os a manter o ritmo.`
          : completionTone === 'early'
          ? `Eles concluíram as primeiras ações. Reforce que já começaram a construir impulso.`
          : completionTone === 'mid'
          ? `Eles estão no meio do plano. Destaque a solidez do progresso e mantenha o foco.`
          : completionTone === 'late'
          ? `Eles estão próximos de concluir o plano. Celebre a consistência e prepare-os para o final.`
          : `Eles concluíram todas as ações. Celebre o plano completo e discuta próximos passos ou evolução.`

      if (planFullyCompleted) {
        const totalActions = Math.max(totalActionsInContext, completedActionsInContext + 1)
        const finalCompleted = Math.min(totalActions, completedActionsInContext + 1)
        const finalPercent = totalActions > 0 ? Math.round((finalCompleted / totalActions) * 100) : 100

        systemMessageOverride = `O usuário concluiu TODAS as ações do plano atual e ALCANÇOU SUA META! 🎉
Progresso final: ${finalPercent}% (${finalCompleted}/${totalActions} ações).
Meta alcançada: "${currentGoal}"

SUA RESPOSTA (em PORTUGUÊS BRASILEIRO):
1. Celebre intensamente esta conquista extraordinária! Reconheça todo o esforço, dedicação e consistência que eles demonstraram nesta jornada completa.
2. Reflita brevemente sobre os aprendizados e ganhos que eles obtiveram ao completar esta meta.
3. IMPORTANTE: Pergunte sobre o próximo objetivo: "Agora que você conquistou esta meta, qual será seu próximo desafio? Que área da sua vida você gostaria de melhorar ou qual novo objetivo você quer alcançar?"
4. Encoraje-os a criar uma nova meta: "Vamos criar sua próxima meta juntos? Você pode criar diretamente na página de Metas ou podemos conversar aqui para definir seu próximo objetivo."
5. Mantenha a resposta calorosa, inspiradora e focada em motivá-los para o próximo passo (4-5 frases).

IMPORTANTE:
- Deixe claro que eles COMPLETARAM a meta atual com sucesso.
- Foque em encorajar a criação de uma NOVA meta.
- Seja entusiasta sobre o próximo desafio, não apenas sobre a conquista passada.
- Guie-os naturalmente para pensar no futuro e no próximo objetivo.`
      } else {
        // Set system message override for completion (parcial)
        systemMessageOverride = `O usuário acabou de completar com sucesso a ação: "${currentAction.title}".
${progressSummaryText}
Estimativa após esta conclusão: ${Math.min(
          progressPercentFromContext +
            (planContext?.progress
              ? Math.round(100 / Math.max(planContext.progress.totalActions, 1))
              : 0),
          100
        )}%.
${nextActionRecord ? `Próxima ação disponível: "${nextActionRecord.title}"${nextActionRecord.description ? ` — ${nextActionRecord.description}` : ''}.${nextMilestoneForNextAction ? ` Esta ação faz parte do marco: "${nextMilestoneForNextAction.title}".` : ''}` : 'Todas as ações foram concluídas.'}

SUA RESPOSTA (em PORTUGUÊS BRASILEIRO):
1. Ajuste seu tom de acordo com esta orientação: ${completionToneGuidance}
2. Celebre a conquista deles de forma compatível com o progresso real: "Parabéns por completar '${currentAction.title}'! Isso é um passo importante."
3. **IMPORTANTE - INFORMAR SOBRE A PRÓXIMA AÇÃO**: ${nextActionRecord 
          ? `Agora, informe claramente sobre a próxima ação: "Agora vamos trabalhar em: **${nextActionRecord.title}**${nextMilestoneForNextAction ? `. Este é um passo importante para alcançar o marco '${nextMilestoneForNextAction.title}'.` : ''}" ${nextActionRecord.description ? `Explique brevemente: "${nextActionRecord.description}". ` : ''}Pergunte se eles têm alguma dúvida sobre como começar ou se precisam de orientação sobre esta ação.`
          : 'Todas as ações foram concluídas. Parabéns pela conquista completa!'}
4. Seja encorajador, caloroso e mantenha 3-4 frases.

IMPORTANTE:
- Não superestime o progresso se o percentual ainda for baixo. Foque em encorajar os próximos passos.
- **SEMPRE informe sobre a próxima ação de forma clara e destacada quando houver uma próxima ação disponível.**
- Deixe-os sentir a conquista no ritmo certo para o estágio atual.
- Termine com incentivo personalizado e uma pergunta sobre a próxima ação.`
      }
    } else if (completionPrompted) {
      // Confirmation was requested; skip further keyword handling
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
${progressSummaryText}
Orientação de estágio: ${progressGuidance}

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
${progressSummaryText}
Orientação de estágio: ${progressGuidance}

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
    const { data: recentMessages } = await supabase
      .from('messages')
      .select('role, content, created_at, is_deleted')
      .eq('user_id', user.id)
      .eq('goal_id', goalId || null)
      .order('created_at', { ascending: false })
      .limit(10)

    // Count conversation turns (user messages) to detect when to refocus
    const userMessageCount = (recentMessages || []).filter(m => m.role === 'user').length

    // Reverse to get chronological order
    const messageHistory = (recentMessages || [])
      .reverse()
      .map((m) => ({ 
        role: m.role as 'user' | 'assistant' | 'system', 
        content: m.is_deleted
          ? `[HISTÓRICO REMOVIDO PELO USUÁRIO - CONTEÚDO ORIGINAL:] ${m.content}`
          : m.content,
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

Your role is to NATURALLY guide the user toward completing this action. Be solidário, útil e conversacional. Relembre o usuário de que, ao concluir a ação, ele deve responder com "Concluído". Se não conseguir realizar, a resposta deve ser "Não consegui fazer". Caso precise mudar algo, instrua-o a escrever "Ajustar". Só cheque o status depois de conversar sobre a ação.`

      // If no keyword detected but we have a plan, guide the conversation naturally
      if (!keyword && planContext.currentAction && !systemMessageOverride) {
        // Determine conversation stage based on message count
        const conversationStage = userMessageCount <= 1 ? 'initial' : 
                                 userMessageCount <= 4 ? 'guiding' : 
                                 userMessageCount <= 7 ? 'checking' : 'evaluating'
        
        if (conversationStage === 'initial') {
          systemMessageOverride = `Você é um mentor solidário e orientado a metas ajudando o usuário a trabalhar em direção à sua meta: "${currentGoal}".

SITUAÇÃO ATUAL:
- ${progressSummaryText}
- Marco atual: "${planContext.currentMilestone?.title}"
- Ação de hoje: "${planContext.currentAction.title}"
- Orientação de estágio: ${progressGuidance}

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
- ${progressSummaryText}
- Marco atual: "${planContext.currentMilestone?.title}"
- Ação: "${planContext.currentAction.title}"
- Orientação de estágio: ${progressGuidance}

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
- ${progressSummaryText}
- Eles têm discutido esta ação por várias trocas
- Orientação de estágio: ${progressGuidance}

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
- ${progressSummaryText}
- Vocês têm discutido esta ação por um tempo
- Orientação de estágio: ${progressGuidance}

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
        pageContext: pageContext || request.nextUrl.pathname,
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

