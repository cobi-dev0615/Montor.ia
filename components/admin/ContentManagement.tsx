'use client'

import { useEffect, useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Edit, Save, X, Plus, Image as ImageIcon } from 'lucide-react'

interface AvatarStage {
  level: number
  stage_name: string
  description: string | null
  min_progress_points: number
  image_url: string | null
  created_at: string
}

export function ContentManagement() {
  const [stages, setStages] = useState<AvatarStage[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<number | null>(null)
  const [editedStage, setEditedStage] = useState<AvatarStage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const supabase = createSupabaseClient()

  useEffect(() => {
    fetchStages()
  }, [])

  const fetchStages = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('avatar_stages')
        .select('*')
        .order('level', { ascending: true })

      if (error) {
        console.error('Error fetching avatar stages:', error)
        setError('Failed to load avatar stages')
        return
      }

      setStages(data || [])
    } catch (error) {
      console.error('Error fetching avatar stages:', error)
      setError('Failed to load avatar stages')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (stage: AvatarStage) => {
    setEditing(stage.level)
    setEditedStage({ ...stage })
    setError(null)
  }

  const handleCancel = () => {
    setEditing(null)
    setEditedStage(null)
    setError(null)
  }

  const handleSave = async () => {
    if (!editedStage) return

    try {
      setSaving(true)
      setError(null)

      const { error: updateError } = await supabase
        .from('avatar_stages')
        .update({
          stage_name: editedStage.stage_name,
          description: editedStage.description,
          min_progress_points: editedStage.min_progress_points,
          image_url: editedStage.image_url,
        })
        .eq('level', editedStage.level)

      if (updateError) {
        throw updateError
      }

      await fetchStages()
      setEditing(null)
      setEditedStage(null)
    } catch (error) {
      console.error('Error saving avatar stage:', error)
      setError(error instanceof Error ? error.message : 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Content Management</h1>
        <p className="text-gray-600 mt-1">Manage avatar stages and platform content</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Avatar Stages Management */}
      <Card className="overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Avatar Stages</h2>
              <p className="text-sm text-gray-600 mt-1">
                Manage avatar evolution stages and their requirements
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stage Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Min Points
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Image URL
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No avatar stages found.
                  </td>
                </tr>
              ) : (
                stages.map((stage) => (
                  <tr key={stage.level} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">Level {stage.level}</div>
                    </td>
                    <td className="px-6 py-4">
                      {editing === stage.level ? (
                        <Input
                          type="text"
                          value={editedStage?.stage_name || ''}
                          onChange={(e) =>
                            setEditedStage((prev) => (prev ? { ...prev, stage_name: e.target.value } : null))
                          }
                          className="w-full"
                        />
                      ) : (
                        <div className="text-sm font-medium text-gray-900 capitalize">{stage.stage_name}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editing === stage.level ? (
                        <Input
                          type="text"
                          value={editedStage?.description || ''}
                          onChange={(e) =>
                            setEditedStage((prev) => (prev ? { ...prev, description: e.target.value } : null))
                          }
                          className="w-full"
                          placeholder="Stage description"
                        />
                      ) : (
                        <div className="text-sm text-gray-500">{stage.description || 'No description'}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editing === stage.level ? (
                        <Input
                          type="number"
                          value={editedStage?.min_progress_points || 0}
                          onChange={(e) =>
                            setEditedStage((prev) =>
                              prev ? { ...prev, min_progress_points: parseInt(e.target.value) || 0 } : null
                            )
                          }
                          className="w-full"
                          min="0"
                        />
                      ) : (
                        <div className="text-sm text-gray-500">{stage.min_progress_points} points</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editing === stage.level ? (
                        <Input
                          type="text"
                          value={editedStage?.image_url || ''}
                          onChange={(e) =>
                            setEditedStage((prev) => (prev ? { ...prev, image_url: e.target.value } : null))
                          }
                          className="w-full"
                          placeholder="/avatars/stage.svg"
                        />
                      ) : (
                        <div className="flex items-center text-sm text-gray-500">
                          {stage.image_url ? (
                            <>
                              <ImageIcon className="w-4 h-4 mr-2" />
                              <span className="truncate max-w-xs">{stage.image_url}</span>
                            </>
                          ) : (
                            <span>No image</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {editing === stage.level ? (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Save className="w-4 h-4 mr-1" />
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancel} disabled={saving}>
                            <X className="w-4 h-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => handleEdit(stage)}>
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Summary */}
      <Card className="p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            Total avatar stages: <strong>{stages.length}</strong>
          </span>
          <span className="text-gray-600">
            Levels {stages.length > 0 ? `1-${stages.length}` : '0'}
          </span>
        </div>
      </Card>
    </div>
  )
}

