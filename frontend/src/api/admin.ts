import { http } from './client'
import type { AdminDashboard, AdminUser, UsersParams } from './adminTypes'
import type { PageResponse, Role } from './types'

export async function getAdminDashboard(signal?: AbortSignal): Promise<AdminDashboard> {
  const { data } = await http.get<AdminDashboard>('/api/admin/dashboard', { signal })
  return data
}

export async function listUsers(params: UsersParams, signal?: AbortSignal): Promise<PageResponse<AdminUser>> {
  const { data } = await http.get<PageResponse<AdminUser>>('/api/admin/users', { params, signal })
  return data
}

/** The server refuses to change the caller's own account and explains why. */
export async function setUserEnabled(id: number, enabled: boolean): Promise<AdminUser> {
  const { data } = await http.put<AdminUser>(`/api/admin/users/${id}/enabled`, { enabled })
  return data
}

export async function setUserRole(id: number, role: Role): Promise<AdminUser> {
  const { data } = await http.put<AdminUser>(`/api/admin/users/${id}/role`, { role })
  return data
}