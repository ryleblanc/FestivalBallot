import { Ticket } from 'lucide-react'
import { PARTICIPANTS, type ParticipantId } from '../types'
import { SCREENINGS } from '../data/schedule'

interface IdentityGateProps {
  onChoose: (participantId: ParticipantId) => void
}

export function IdentityGate({ onChoose }: IdentityGateProps) {
  return (
    <main className="identity-gate">
      <img
        className="identity-backdrop"
        src={SCREENINGS[0].imageUrl}
        alt="Still from Hope"
        referrerPolicy="no-referrer"
      />
      <section className="identity-panel" aria-labelledby="identity-title">
        <div className="brand-mark" aria-hidden="true">
          <Ticket size={24} strokeWidth={1.8} />
          <span>TIFF 26</span>
        </div>
        <p className="eyebrow">Festival Ballot</p>
        <h1 id="identity-title">Whose ballot is this?</h1>
        <div className="identity-options">
          {Object.values(PARTICIPANTS).map((participant) => (
            <button
              className="identity-button"
              key={participant.id}
              type="button"
              onClick={() => onChoose(participant.id)}
            >
              <span>{participant.name}</span>
              <span aria-hidden="true">→</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  )
}