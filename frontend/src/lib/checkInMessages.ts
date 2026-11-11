import { toApiError, userMessage } from '../api/errors'

/** What to tell the person at the door when a check-in is refused. */
export function checkInFailureMessage(error: unknown): string {
  if (toApiError(error).status === 404) {
    return 'No ticket with this code was found for this event.'
  }
  // For everything else the server explains: already used, cancelled, check-in not open yet, and so on.
  return userMessage(error)
}