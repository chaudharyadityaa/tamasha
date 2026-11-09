import { useEffect, useState } from 'react'
import { toApiError, userMessage } from '../api/errors'
import { getTicketQr } from '../api/tickets'

interface Settled {
  key: string
  url: string | null
  error: string | null
}

function qrMessage(error: unknown): string {
  return toApiError(error).status === 409
    ? 'This ticket can no longer be used, so it has no QR code.'
    : userMessage(error)
}

/**
 * Downloads a ticket's QR image (with the login token) and exposes it as a temporary in-browser URL.
 * The URL is released when the page is left. Pass enabled=false for tickets that have no QR code.
 */
export function useTicketQr(ticketId: number, enabled: boolean) {
  const key = String(ticketId)
  const [settled, setSettled] = useState<Settled | null>(null)

  useEffect(() => {
    if (!enabled) {
      return
    }
    const controller = new AbortController()
    let objectUrl: string | null = null
    getTicketQr(ticketId, controller.signal)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob)
        setSettled({ key, url: objectUrl, error: null })
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setSettled({ key, url: null, error: qrMessage(error) })
        }
      })
    return () => {
      controller.abort()
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [ticketId, enabled, key])

  const current = enabled && settled?.key === key ? settled : null
  return {
    url: current?.url ?? null,
    error: current?.error ?? null,
    loading: enabled && current === null,
  }
}