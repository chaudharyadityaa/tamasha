import { useEffect, useState } from 'react'
import { userMessage } from '../api/errors'
import { searchEvents } from '../api/events'
import type { EventSummary } from '../api/types'
import { CategoryTiles } from '../components/home/CategoryTiles'
import { HeroSection } from '../components/home/HeroSection'
import { HowItWorks } from '../components/home/HowItWorks'
import { OrganizerBand } from '../components/home/OrganizerBand'
import { SoonRail } from '../components/home/SoonRail'
import type { RailState } from '../components/home/SoonRail'

interface Settled {
  attempt: number
  events: EventSummary[] | null
  error: string | null
}

export function HomePage() {
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<Settled | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    searchEvents({ size: 8, sort: 'date' }, controller.signal)
      .then((page) => setSettled({ attempt, events: page.content, error: null }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setSettled({ attempt, events: null, error: userMessage(error) })
        }
      })
    return () => controller.abort()
  }, [attempt])

  const rail: RailState =
    settled === null || settled.attempt !== attempt
      ? { status: 'loading' }
      : settled.error
        ? { status: 'error', message: settled.error }
        : { status: 'ready', events: settled.events ?? [] }

  return (
    <div className="pb-20">
      <HeroSection />
      <SoonRail state={rail} onRetry={() => setAttempt((count) => count + 1)} />
      <CategoryTiles />
      <HowItWorks />
      <OrganizerBand />
    </div>
  )
}