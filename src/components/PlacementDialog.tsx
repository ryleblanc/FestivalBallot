import { X } from 'lucide-react'
import { SCREENINGS_BY_ID } from '../data/schedule'
import type { PlacementOutcome } from '../lib/ranking'

interface PlacementDialogProps {
  placement: PlacementOutcome | null
  onAnswer: (newFilmRanksHigher: boolean) => void
  onClose: () => void
}

export function PlacementDialog({
  placement,
  onAnswer,
  onClose,
}: PlacementDialogProps) {
  if (!placement || placement.done) return null

  const newFilm = SCREENINGS_BY_ID.get(placement.session.filmId)
  const comparedFilm = SCREENINGS_BY_ID.get(placement.compareWithId)
  if (!newFilm || !comparedFilm) return null

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="comparison-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="comparison-title"
      >
        <button
          className="icon-button close-button"
          type="button"
          onClick={onClose}
          aria-label="Close ranking comparison"
          title="Close"
        >
          <X size={20} />
        </button>
        <p className="eyebrow">Place {newFilm.title}</p>
        <h2 id="comparison-title">Which ranks higher?</h2>
        <div className="comparison-options">
          <button type="button" onClick={() => onAnswer(true)}>
            <img
              src={newFilm.imageUrl}
              alt=""
              referrerPolicy="no-referrer"
            />
            <strong>{newFilm.title}</strong>
          </button>
          <span>or</span>
          <button type="button" onClick={() => onAnswer(false)}>
            <img
              src={comparedFilm.imageUrl}
              alt=""
              referrerPolicy="no-referrer"
            />
            <strong>{comparedFilm.title}</strong>
          </button>
        </div>
      </section>
    </div>
  )
}