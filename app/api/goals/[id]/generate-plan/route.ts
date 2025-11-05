import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getChatCompletion } from '@/lib/openai/client'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get goal
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .single()

    if (goalError || !goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    // Check if milestones already exist
    const { count: existingCount } = await supabase
      .from('milestones')
      .select('*', { count: 'exact', head: true })
      .eq('goal_id', goal.id)
      .eq('is_deleted', false)

    if (existingCount && existingCount > 0) {
      return NextResponse.json({ 
        message: 'Plan already exists',
        milestones: []
      })
    }

    // Get user context for personalized plan
    const { data: userData } = await supabase
      .from('users')
      .select('full_name, total_progress, consistency_streak')
      .eq('id', user.id)
      .single()

    // Generate personalized plan using OpenAI
    const planPrompt = `You are creating a personalized progress plan for a user working toward their goal.

User Context:
- Name: ${userData?.full_name || 'User'}
- Current Progress Points: ${userData?.total_progress || 0}
- Consistency Streak: ${userData?.consistency_streak || 0} days

Goal Details:
- Main Goal: "${goal.main_goal}"
- Title: ${goal.title}
${goal.description ? `- Description: ${goal.description}` : ''}

Create a personalized progress plan with 3-5 checkpoints (milestones) that break down this goal into actionable steps.
Each checkpoint should have 3-5 simple, concise micro-actions (keep titles short, no detailed descriptions needed).

Return ONLY a valid JSON object with this exact structure:
{
  "plan": [
    {
      "milestone_title": "Checkpoint 1 Title",
      "milestone_description": "Brief description of this checkpoint",
      "order_index": 1,
      "micro_actions": [
        {"action_title": "Simple action 1"},
        {"action_title": "Simple action 2"}
      ]
    },
    {
      "milestone_title": "Checkpoint 2 Title",
      "milestone_description": "Brief description",
      "order_index": 2,
      "micro_actions": [
        {"action_title": "Simple action"}
      ]
    }
  ]
}

IMPORTANT GUIDELINES:
- Keep action titles SHORT and SIMPLE (2-5 words max)
- Do NOT include action_description in micro_actions - only action_title
- Focus on action titles only - they should be self-explanatory
- Make actions specific but concise
- Personalized based on user's current progress and consistency
- Progressive (each checkpoint builds on the previous)
- Realistic and achievable

CRITICAL: Return ONLY the JSON object, no additional text, no markdown, no explanations. The response must be valid JSON that can be parsed directly.`

    const planResponse = await getChatCompletion(
      [
        {
          role: 'user',
          content: planPrompt,
        },
      ],
      undefined,
      { maxTokens: 2000, jsonMode: true }
    )

    if (!planResponse) {
      return NextResponse.json(
        { error: 'Failed to generate plan' },
        { status: 500 }
      )
    }

    // Parse plan response with better error handling
    let planData: { plan: Array<{ milestone_title: string; milestone_description: string; order_index: number; micro_actions: Array<{ action_title: string; action_description: string }> }> }
    
    console.log('Raw OpenAI Response:', planResponse)
    
    try {
      // Try to extract JSON from markdown code blocks or plain text
      let jsonString = planResponse.trim()
      
      // Remove markdown code blocks if present
      jsonString = jsonString.replace(/```json\s*/g, '').replace(/```\s*/g, '')
      
      // Try to find JSON object
      const jsonMatch = jsonString.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        jsonString = jsonMatch[0]
      }
      
      planData = JSON.parse(jsonString)

      // Handle different response formats
      if (Array.isArray(planData)) {
        // If response is directly an array, wrap it
        planData = { plan: planData }
      } else if (planData.milestones && Array.isArray(planData.milestones)) {
        // If response has milestones array instead of plan
        planData = { plan: planData.milestones }
      } else if (!planData.plan) {
        // If plan doesn't exist, try to construct from other fields
        console.error('Unexpected response format:', planData)
        throw new Error('Response missing plan array')
      }
      
      // Validate plan structure
      if (!Array.isArray(planData.plan)) {
        throw new Error('Plan is not an array')
      }
      
      // Normalize each checkpoint
      planData.plan = planData.plan.map((checkpoint: any, index: number) => {
        return {
          milestone_title: checkpoint.milestone_title || checkpoint.title || `Checkpoint ${index + 1}`,
          milestone_description: checkpoint.milestone_description || checkpoint.description || null,
          order_index: checkpoint.order_index || index + 1,
          micro_actions: Array.isArray(checkpoint.micro_actions) 
            ? checkpoint.micro_actions.map((action: any) => ({
                action_title: action.action_title || action.title || 'Daily action',
                // No descriptions - keep actions simple
              }))
            : checkpoint.actions || []
        }
      })
      
    } catch (parseError) {
      console.error('Error parsing plan:', parseError)
      console.error('AI Response:', planResponse)
      return NextResponse.json(
        { 
          error: 'Failed to parse plan data',
          details: parseError instanceof Error ? parseError.message : 'Unknown parsing error',
          rawResponse: planResponse.substring(0, 500) // First 500 chars for debugging
        },
        { status: 500 }
      )
    }

    if (!planData || !Array.isArray(planData.plan) || planData.plan.length === 0) {
      return NextResponse.json(
        { error: 'Invalid plan data format' },
        { status: 500 }
      )
    }

    // Ensure we have 3-5 checkpoints
    const checkpoints = planData.plan.slice(0, 5) // Limit to max 5

    // Insert milestones and actions together
    const milestonesToInsert = []
    const allActions: any[] = []

    for (const checkpoint of checkpoints) {
      const milestoneId = crypto.randomUUID()
      
      milestonesToInsert.push({
        id: milestoneId,
        goal_id: goal.id,
        title: checkpoint.milestone_title || `Checkpoint ${checkpoint.order_index}`,
        description: checkpoint.milestone_description || null,
        order_index: checkpoint.order_index || milestonesToInsert.length + 1,
        status: 'pending',
        is_deleted: false,
      })

      // Add micro-actions for this milestone (no descriptions, just titles)
      if (checkpoint.micro_actions && Array.isArray(checkpoint.micro_actions)) {
        const actionsToInsert = checkpoint.micro_actions
          .slice(0, 5) // Limit to max 5 actions per milestone
          .map((action: any) => ({
            milestone_id: milestoneId,
            user_id: user.id,
            title: action.action_title || action.title || 'Daily action',
            description: null, // No descriptions - keep actions simple
            status: 'pending',
            is_deleted: false,
          }))

        allActions.push(...actionsToInsert)
      }
    }

    // Insert milestones
    const { data: createdMilestones, error: insertError } = await supabase
      .from('milestones')
      .insert(milestonesToInsert)
      .select()

    if (insertError) {
      console.error('Error inserting milestones:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Insert all micro-actions
    if (allActions.length > 0) {
      const { error: actionsError } = await supabase
        .from('actions')
        .insert(allActions)

      if (actionsError) {
        console.error('Error inserting actions:', actionsError)
        return NextResponse.json({ error: actionsError.message }, { status: 500 })
      }
    }

    // Send initial message to chat after plan generation
    // This is done asynchronously, don't wait for it
    fetch(`${request.nextUrl.origin}/api/goals/${goal.id}/initial-message`, {
      method: 'POST',
    }).catch(err => {
      console.error('Error sending initial message:', err)
      // Don't fail the plan generation if initial message fails
    })

    return NextResponse.json({ 
      milestones: createdMilestones || [],
      message: 'Plan generated successfully',
      actionsCount: allActions.length
    })
  } catch (error) {
    console.error('Generate plan API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

