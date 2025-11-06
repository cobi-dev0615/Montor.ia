'use client'

import { useEffect, useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EditUserModal } from './EditUserModal'
import { useNotification } from '@/hooks/useNotification'
import { Search, Shield, ShieldOff, Mail, Calendar, TrendingUp, Edit, Trash2 } from 'lucide-react'

interface User {
  id: string
  email: string
  full_name: string | null
  is_admin: boolean
  total_progress: number
  consistency_streak: number
  created_at: string
}

export function UserManagement() {
  const { showNotification } = useNotification()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const supabase = createSupabaseClient()

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching users:', error)
        return
      }

      // Filter out soft-deleted users if is_deleted column exists
      const activeUsers = (data || []).filter((user: any) => !user.is_deleted)
      setUsers(activeUsers)
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleAdminStatus = async (userId: string, currentStatus: boolean) => {
    try {
      setUpdating(userId)

      // Call API to update admin status
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          isAdmin: !currentStatus,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Falha ao atualizar status de admin')
      }

      showNotification(
        `Status de admin ${!currentStatus ? 'concedido' : 'removido'} com sucesso`,
        'success'
      )
      // Refresh users list
      await fetchUsers()
    } catch (error) {
      console.error('Error updating admin status:', error)
        showNotification(
          error instanceof Error ? error.message : 'Falha ao atualizar status de admin',
          'error'
        )
    } finally {
      setUpdating(null)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Tem certeza de que deseja excluir este usuário? Esta ação não pode ser desfeita.')) {
      return
    }

    try {
      setDeletingUserId(userId)

      const response = await fetch(`/api/admin/users?userId=${userId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Falha ao excluir usuário')
      }

      showNotification('Usuário excluído com sucesso', 'success')
      await fetchUsers()
    } catch (error) {
      console.error('Error deleting user:', error)
      showNotification(
        error instanceof Error ? error.message : 'Falha ao excluir usuário',
        'error'
      )
    } finally {
      setDeletingUserId(null)
    }
  }

  const handleEditSuccess = () => {
    showNotification('Usuário atualizado com sucesso', 'success')
    fetchUsers()
  }

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00d4ff]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-100">Gerenciamento de Usuários</h1>
        <p className="text-gray-400 mt-1">Gerencie usuários e acesso administrativo</p>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="Buscar por email ou nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Users Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[rgba(0,212,255,0.1)] border-b border-[rgba(0,212,255,0.3)]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Usuário
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Registrado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Progresso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(0,212,255,0.2)]">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                    {searchTerm ? 'Nenhum usuário encontrado correspondendo à sua busca.' : 'Nenhum usuário encontrado.'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-[rgba(0,212,255,0.05)] transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-[rgba(0,212,255,0.2)] border border-[rgba(0,212,255,0.3)] rounded-full flex items-center justify-center">
                          <Mail className="w-5 h-5 text-[#00d4ff]" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-100">
                            {user.full_name || 'Sem nome'}
                          </div>
                          <div className="text-sm text-gray-400">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-300">
                        <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                        {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-300">
                        <TrendingUp className="w-4 h-4 mr-2 text-gray-400" />
                        {user.total_progress} pts · sequência de {user.consistency_streak} dias
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.is_admin ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[rgba(147,51,234,0.2)] text-purple-300 border border-[rgba(147,51,234,0.3)]">
                          <Shield className="w-3 h-3 mr-1" />
                          Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[rgba(107,114,128,0.2)] text-gray-300 border border-[rgba(107,114,128,0.3)]">
                          Usuário
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingUser(user)}
                          className="border-[rgba(0,212,255,0.3)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.1)]"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleAdminStatus(user.id, user.is_admin)}
                          disabled={updating === user.id}
                          className="border-[rgba(0,212,255,0.3)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.1)]"
                          title={user.is_admin ? 'Remover status de admin' : 'Conceder status de admin'}
                        >
                          {updating === user.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#00d4ff]"></div>
                          ) : user.is_admin ? (
                            <ShieldOff className="w-4 h-4" />
                          ) : (
                            <Shield className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={deletingUserId === user.id}
                          className="border-[rgba(239,68,68,0.3)] text-red-400 hover:bg-[rgba(239,68,68,0.1)]"
                          title="Excluir usuário"
                        >
                          {deletingUserId === user.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400"></div>
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
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
          <span className="text-gray-300">
            Mostrando {filteredUsers.length} de {users.length} usuários
          </span>
          <span className="text-gray-300">
            {users.filter((u) => u.is_admin).length} admin{users.filter((u) => u.is_admin).length !== 1 ? 's' : ''}
          </span>
        </div>
      </Card>

      {/* Edit User Modal */}
      <EditUserModal
        isOpen={editingUser !== null}
        user={editingUser}
        onClose={() => setEditingUser(null)}
        onSuccess={handleEditSuccess}
      />
    </div>
  )
}

