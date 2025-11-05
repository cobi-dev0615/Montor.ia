import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getChatCompletion } from '@/lib/openai/client'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify goal ownership
    const { data: goal } = await supabase
      .from('goals')
      .select('id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .single()

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    // Fetch milestones
    const { data: milestones, error } = await supabase
      .from('milestones')
      .select('*')
      .eq('goal_id', params.id)
      .eq('is_deleted', false)
      .order('order_index', { ascending: true })

    if (error) {
      console.error('Error fetching milestones:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ milestones: milestones || [] })
  } catch (error) {
    console.error('Get milestones API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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
        message: 'Milestones already exist',
        milestones: []
      })
    }

    // Generate milestones using OpenAI
    const prompt = `Given the following goal: "${goal.main_goal}"

Title: ${goal.title}
${goal.description ? `Description: ${goal.description}` : ''}

Create 5-7 milestones (progress checkpoints) that break down this goal into actionable steps.
Return ONLY a valid JSON array of objects with this exact structure:
[
  {"title": "Milestone title", "description": "Brief description", "order_index": 1},
  {"title": "Milestone title", "description": "Brief description", "order_index": 2},
  ...
]

Order them from first step to last step. Make them specific and actionable.`

    const aiResponse = await getChatCompletion([
      {
        role: 'user',
        content: prompt,
      },
    ])

    if (!aiResponse) {
      return NextResponse.json(
        { error: 'Failed to generate milestones' },
        { status: 500 }
      )
    }

    // Parse AI response (should be JSON array)
    let milestonesData
    try {
      // Try to extract JSON from response if it's wrapped in markdown or text
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        milestonesData = JSON.parse(jsonMatch[0])
      } else {
        milestonesData = JSON.parse(aiResponse)
      }

      // Handle if response is an object with a milestones array
      if (!Array.isArray(milestonesData)) {
        milestonesData = milestonesData.milestones || Object.values(milestonesData)
      }
    } catch (parseError) {
      console.error('Error parsing milestones:', parseError)
      console.error('AI Response:', aiResponse)
      return NextResponse.json(
        { error: 'Failed to parse milestone data' },
        { status: 500 }
      )
    }

    if (!Array.isArray(milestonesData) || milestonesData.length === 0) {
      return NextResponse.json(
        { error: 'Invalid milestone data format' },
        { status: 500 }
      )
    }

    // Insert milestones into database
    const milestonesToInsert = milestonesData.map((m: any, index: number) => ({
      goal_id: goal.id,
      title: m.title || `Milestone ${index + 1}`,
      description: m.description || null,
      order_index: m.order_index || index + 1,
      status: 'pending',
      is_deleted: false,
    }))

    const { data: createdMilestones, error: insertError } = await supabase
      .from('milestones')
      .insert(milestonesToInsert)
      .select()

    if (insertError) {
      console.error('Error inserting milestones:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ 
      milestones: createdMilestones || [],
      message: 'Milestones generated successfully'
    })
  } catch (error) {
    console.error('Generate milestones API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
