import { useId, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { SCREENINGS_BY_ID } from '../data/schedule'

interface ViewingNotesDialogProps {
  filmId: string
  initialNote: string
  mode: 'log' | 'edit'
  onSave: (note: string) => void
  onClose: () => void
}

export function ViewingNotesDialog({
  filmId,
  initialNote,
  mode,
  onSave,
  onClose,
}: ViewingNotesDialogProps) {
  const [note, setNote] = useState(initialNote)
  const titleId = useId()
  const noteId = useId()
  const countId = useId()
  const film = SCREENINGS_BY_ID.get(filmId)

  if (!film) return null

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    onSave(note)
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="form-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <button
          className="icon-button close-button"
          type="button"
          onClick={onClose}
          aria-label={mode === 'log' ? 'Cancel logging film' : 'Close notes'}
          title="Close"
        >
          <X size={20} />
        </button>
        <p className="eyebrow">
          {mode === 'log' ? 'Log a film' : 'Viewing notes'}
        </p>
        <h2 id={titleId}>{film.title}</h2>
        <form className="viewing-notes-form" onSubmit={handleSubmit}>
          <label htmlFor={noteId}>
            Notes <span>Optional</span>
            <textarea
              id={noteId}
              value={note}
              maxLength={2000}
              rows={7}
              autoFocus
              aria-describedby={countId}
              placeholder="First impressions, memorable moments, or details to revisit"
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
          <div className="viewing-notes-actions">
            <span id={countId} className="viewing-notes-count">
              {note.length} / 2,000
            </span>
            <button className="secondary-button" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="primary-button" type="submit">
              {mode === 'log' ? 'Log film' : 'Save notes'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}