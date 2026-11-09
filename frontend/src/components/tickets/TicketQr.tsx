import { useTicketQr } from '../../hooks/useTicketQr'
import { Alert } from '../ui/Alert'
import { Spinner } from '../ui/Spinner'

/** The QR code for a valid ticket. The image is requested only when this component is shown. */
export function TicketQr({ ticketId, description }: { ticketId: number; description: string }) {
  const { url, error, loading } = useTicketQr(ticketId, true)

  if (loading) {
    return (
      <div className="flex h-56 w-56 items-center justify-center">
        <Spinner label="Loading QR code…" />
      </div>
    )
  }
  if (error || !url) {
    return <Alert variant="error">{error ?? 'The QR code could not be loaded.'}</Alert>
  }
  return <img src={url} alt={`Entry QR code for ${description}`} width={224} height={224} className="h-56 w-56" />
}