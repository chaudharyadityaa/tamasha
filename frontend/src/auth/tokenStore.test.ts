import { describe, expect, it } from 'vitest'
import { expiresAtMs, isExpired } from '../lib/jwt'
import { tokenStore } from './tokenStore'

function fakeJwt(payload: object): string {
  const encode = (value: object) =>
    btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${encode({ alg: 'HS256' })}.${encode(payload)}.signature`
}

const nowSeconds = () => Math.floor(Date.now() / 1000)

describe('JWT expiry helpers', () => {
  it('reads the expiry time from a token', () => {
    expect(expiresAtMs(fakeJwt({ exp: 1_800_000_000 }))).toBe(1_800_000_000_000)
  })

  it('treats expired, unreadable and expiry-less tokens as expired', () => {
    expect(isExpired(fakeJwt({ exp: nowSeconds() - 60 }))).toBe(true)
    expect(isExpired('garbage')).toBe(true)
    expect(isExpired(fakeJwt({ sub: '1' }))).toBe(true)
    expect(isExpired(fakeJwt({ exp: nowSeconds() + 3600 }))).toBe(false)
  })
})

describe('tokenStore', () => {
  it('stores a valid token and returns it', () => {
    const token = fakeJwt({ exp: nowSeconds() + 3600 })

    tokenStore.setToken(token)

    expect(tokenStore.getToken()).toBe(token)
  })

  it('drops an expired token the moment it is read', () => {
    tokenStore.setToken(fakeJwt({ exp: nowSeconds() - 60 }))

    expect(tokenStore.getToken()).toBeNull()
    expect(window.sessionStorage.getItem('eventhub.accessToken')).toBeNull()
  })

  it('clear removes the token', () => {
    tokenStore.setToken(fakeJwt({ exp: nowSeconds() + 3600 }))

    tokenStore.clear()

    expect(tokenStore.getToken()).toBeNull()
  })
})