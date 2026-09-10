import { useState, type FormEvent } from 'react'
import { Award, Pencil, Plus, Trash2, X } from 'lucide-react'
import { CATEGORY_GROUPS, OSCAR_CATEGORIES } from '../data/categories'
import { SCREENINGS_BY_ID } from '../data/schedule'
import { createNomination, updateBallot } from '../lib/ballot'
import type { Ballot, Nomination } from '../types'

interface NominationsViewProps {
  ballot: Ballot
  initialFilmId: string | null
  changeBallot: (updater: (current: Ballot) => Ballot) => void
  onConsumeInitialFilm: () => void
  onGoSchedule: () => void
}

interface DialogState {
  filmId: string
  categoryId?: string
  nomination?: Nomination
}

interface NominationDialogProps {
  state: DialogState
  watchedFilmIds: string[]
  onClose: () => void
  onSave: (
    categoryId: string,
    filmId: string,
    nominee: string,
    note: string,
    existing?: Nomination,
  ) => void
}

function NominationDialog({
  state,
  watchedFilmIds,
  onClose,
  onSave,
}: NominationDialogProps) {
  const [filmId, setFilmId] = useState(state.nomination?.filmId ?? state.filmId)
  const [categoryId, setCategoryId] = useState(
    state.nomination?.categoryId ?? state.categoryId ?? OSCAR_CATEGORIES[0].id,
  )
  const [nominee, setNominee] = useState(state.nomination?.nominee ?? '')
  const [note, setNote] = useState(state.nomination?.note ?? '')
  const category = OSCAR_CATEGORIES.find(({ id }) => id === categoryId)!
  const detailRequired = Boolean(
    category.detailLabel && !category.detailPlaceholder?.includes('(optional)'),
  )

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    onSave(categoryId, filmId, nominee, note, state.nomination)
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="form-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nomination-dialog-title"
      >
        <button
          className="icon-button close-button"
          type="button"
          onClick={onClose}
          aria-label="Close nomination form"
          title="Close"
        >
          <X size={20} />
        </button>
        <p className="eyebrow">Personal ballot</p>
        <h2 id="nomination-dialog-title">
          {state.nomination ? 'Edit nomination' : 'Add nomination'}
        </h2>
        <form className="nomination-form" onSubmit={submit}>
          <label>
            Film
            <select value={filmId} onChange={(event) => setFilmId(event.target.value)}>
              {watchedFilmIds.map((id) => (
                <option key={id} value={id}>
                  {SCREENINGS_BY_ID.get(id)?.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Category
            <select
              value={categoryId}
              onChange={(event) => {
                setCategoryId(event.target.value)
                setNominee('')
              }}
            >
              {CATEGORY_GROUPS.map((group) => (
                <optgroup key={group} label={group}>
                  {OSCAR_CATEGORIES.filter((item) => item.group === group).map(
                    (item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ),
                  )}
                </optgroup>
              ))}
            </select>
          </label>
          {category.detailLabel && (
            <label>
              {category.detailLabel}
              <input
                value={nominee}
                onChange={(event) => setNominee(event.target.value)}
                placeholder={category.detailPlaceholder}
                required={detailRequired}
                maxLength={160}
              />
            </label>
          )}
          <label>
            Why this one? <span>Optional</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="The shot, performance, or moment you want to remember"
              rows={3}
              maxLength={500}
            />
          </label>
          <button className="primary-button" type="submit">
            <Award size={18} aria-hidden="true" />
            Save nomination
          </button>
        </form>
      </section>
    </div>
  )
}

export function NominationsView({
  ballot,
  initialFilmId,
  changeBallot,
  onConsumeInitialFilm,
  onGoSchedule,
}: NominationsViewProps) {
  const firstWatchedId = initialFilmId ?? ballot.watchedFilmIds[0] ?? ''
  const [dialog, setDialog] = useState<DialogState | null>(() =>
    initialFilmId ? { filmId: initialFilmId } : null,
  )
  const nominatedCategoryCount = new Set(
    ballot.nominations.map(({ categoryId }) => categoryId),
  ).size

  function closeDialog(): void {
    setDialog(null)
    onConsumeInitialFilm()
  }

  function saveNomination(
    categoryId: string,
    filmId: string,
    nominee: string,
    note: string,
    existing?: Nomination,
  ): void {
    changeBallot((current) => {
      const nextNomination = existing
        ? { ...existing, categoryId, filmId, nominee: nominee.trim(), note: note.trim() }
        : createNomination(categoryId, filmId, nominee, note)
      return updateBallot(current, {
        nominations: existing
          ? current.nominations.map((item) =>
              item.id === existing.id ? nextNomination : item,
            )
          : [...current.nominations, nextNomination],
      })
    })
    closeDialog()
  }

  return (
    <section className="view nominations-view" aria-labelledby="nominations-title">
      <div className="view-heading">
        <div>
          <p className="eyebrow">Your ballot</p>
          <h2 id="nominations-title">Nominations</h2>
        </div>
        <p className="view-stat">
          <strong>{ballot.nominations.length}</strong> picks · {nominatedCategoryCount}{' '}
          categories
        </p>
      </div>

      {ballot.watchedFilmIds.length === 0 ? (
        <div className="empty-state">
          <Award size={30} strokeWidth={1.5} aria-hidden="true" />
          <h3>No films logged yet</h3>
          <button type="button" onClick={onGoSchedule}>
            Open schedule
          </button>
        </div>
      ) : (
        <>
          <div className="view-toolbar">
            <p>24 Academy Award categories</p>
            <button
              className="primary-button compact"
              type="button"
              onClick={() => setDialog({ filmId: firstWatchedId })}
            >
              <Plus size={17} aria-hidden="true" />
              Add nomination
            </button>
          </div>

          <div className="category-ledger">
            {CATEGORY_GROUPS.map((group) => (
              <section className="category-group" key={group}>
                <h3>{group}</h3>
                {OSCAR_CATEGORIES.filter((category) => category.group === group).map(
                  (category) => {
                    const nominations = ballot.nominations.filter(
                      ({ categoryId }) => categoryId === category.id,
                    )
                    return (
                      <div className="category-row" key={category.id}>
                        <div className="category-title">
                          <span>{category.name}</span>
                          <button
                            className="icon-button subtle"
                            type="button"
                            title={`Add ${category.name} nomination`}
                            aria-label={`Add ${category.name} nomination`}
                            onClick={() =>
                              setDialog({
                                filmId: firstWatchedId,
                                categoryId: category.id,
                              })
                            }
                          >
                            <Plus size={17} />
                          </button>
                        </div>
                        {nominations.length === 0 ? (
                          <p className="category-empty">No picks yet</p>
                        ) : (
                          <div className="nomination-items">
                            {nominations.map((nomination) => {
                              const film = SCREENINGS_BY_ID.get(nomination.filmId)
                              return (
                                <article className="nomination-item" key={nomination.id}>
                                  <img
                                    src={film?.imageUrl}
                                    alt=""
                                    loading="lazy"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div>
                                    <strong>{nomination.nominee || film?.title}</strong>
                                    {nomination.nominee && <span>{film?.title}</span>}
                                    {nomination.note && <p>{nomination.note}</p>}
                                  </div>
                                  <div className="nomination-actions">
                                    <button
                                      className="icon-button subtle"
                                      type="button"
                                      title="Edit nomination"
                                      aria-label={`Edit ${film?.title} nomination`}
                                      onClick={() =>
                                        setDialog({
                                          filmId: nomination.filmId,
                                          nomination,
                                        })
                                      }
                                    >
                                      <Pencil size={16} />
                                    </button>
                                    <button
                                      className="icon-button subtle danger"
                                      type="button"
                                      title="Delete nomination"
                                      aria-label={`Delete ${film?.title} nomination`}
                                      onClick={() =>
                                        changeBallot((current) =>
                                          updateBallot(current, {
                                            nominations: current.nominations.filter(
                                              ({ id }) => id !== nomination.id,
                                            ),
                                          }),
                                        )
                                      }
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </article>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  },
                )}
              </section>
            ))}
          </div>
        </>
      )}

      {dialog && (
        <NominationDialog
          key={`${dialog.nomination?.id ?? 'new'}-${dialog.filmId}-${dialog.categoryId ?? ''}`}
          state={dialog}
          watchedFilmIds={ballot.watchedFilmIds}
          onClose={closeDialog}
          onSave={saveNomination}
        />
      )}
    </section>
  )
}