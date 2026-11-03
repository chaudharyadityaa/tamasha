import { http } from './client'
import type { RegisterInput, TokenResponse, User } from './types'

export async function loginRequest(email: string, password: string): Promise<TokenResponse> {
  const { data } = await http.post<TokenResponse>('/api/auth/login', { email, password })
  return data
}

export async function registerRequest(input: RegisterInput): Promise<User> {
  const { data } = await http.post<User>('/api/auth/register', input)
  return data
}

export async function fetchCurrentUser(): Promise<User> {
  const { data } = await http.get<User>('/api/auth/me')
  return data
}