import { useState } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  ListOrdered,
  Scale,
} from 'lucide-react'
import { SCREENINGS_BY_ID } from '../data/schedule'
import {
  answerPlacement,
  beginPlacement,
  moveInRanking,
  type PlacementOutcome,
} from '../lib/ranking'
import { updateBallot } from '../lib/ballot'
import type { Ballot } from '../types'
import { PlacementDialog } from './PlacementDialog'

interface RankingViewProps {
  ballot: Ballot
  changeBallot: (updater: (current: Ballot) => Ballot) => void
  onGoSchedule: () => void
}

interface SortableFilmProps {
  filmId: string
  position: number
  total: number
  onMove: (filmId: string, direction: -1 | 1) => void
  onReplace: (filmId: string) => void
}

function SortableFilm({
  filmId,
  position,
  total,
  onMove,
  onReplace,
}: SortableFilmProps) {
  const film = SCREENINGS_BY_ID.get(filmId)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: filmId })

  if (!film) return null

  return (
    <article
      className={isDragging ? 'ranking-row dragging' : 'ranking-row'}
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <span className="rank-number">{position}</span>
      <img src={film.imageUrl} alt="" referrerPolicy="no-referrer" />
      <strong>{film.title}</strong>
      <div className="ranking-actions">
        <button
          className="icon-button subtle"
          type="button"
          title="Place with comparisons"
          aria-label={`Place ${film.title} with comparisons`}
          onClick={() => onReplace(filmId)}
        >
          <Scale size={16} />
        </button>
        <button
          className="icon-button subtle desktop-hidden"
          type="button"
          title="Move up"
          aria-label={`Move ${film.title} up`}
          disabled={position === 1}
          onClick={() => onMove(filmId, -1)}
        >
          <ArrowUp size={16} />
        </button>
        <button
          className="icon-button subtle desktop-hidden"
          type="button"
          title="Move down"
          aria-label={`Move ${film.title} down`}
          disabled={position === total}
          onClick={() => onMove(filmId, 1)}
        >
          <ArrowDown size={16} />
        </button>
        <button
          className="drag-handle"
          type="button"
          title="Drag to reorder"
          aria-label={`Drag ${film.title} to reorder`}
          {...attributes}
          {...listeners}
        >
          <GripVertical size={20} />
        </button>
      </div>
    </article>
  )
}

export function RankingView({
  ballot,
  changeBallot,
  onGoSchedule,
}: RankingViewProps) {
  const [placement, setPlacement] = useState<PlacementOutcome | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const unranked = ballot.watchedFilmIds.filter(
    (filmId) => !ballot.ranking.includes(filmId),
  )

  function startPlacement(filmId: string): void {
    const outcome = beginPlacement(filmId, ballot.ranking)
    if (outcome.done) {
      changeBallot((current) => updateBallot(current, { ranking: outcome.ranking }))
    } else {
      setPlacement(outcome)
    }
  }

  function answerComparison(newFilmRanksHigher: boolean): void {
    if (!placement || placement.done) return
    const outcome = answerPlacement(placement.session, newFilmRanksHigher)
    if (outcome.done) {
      changeBallot((current) => updateBallot(current, { ranking: outcome.ranking }))
      setPlacement(null)
    } else {
      setPlacement(outcome)
    }
  }

  function handleDragEnd(event: DragEndEvent): void {
    const { active, over } = event
    if (!over || active.id === over.id) return
    changeBallot((current) => {
      const oldIndex = current.ranking.indexOf(String(active.id))
      const newIndex = current.ranking.indexOf(String(over.id))
      return updateBallot(current, {
        ranking: arrayMove(current.ranking, oldIndex, newIndex),
      })
    })
  }

  function move(filmId: string, direction: -1 | 1): void {
    changeBallot((current) =>
      updateBallot(current, {
        ranking: moveInRanking(current.ranking, filmId, direction),
      }),
    )
  }

  return (
    <section className="view ranking-view" aria-labelledby="ranking-title">
      <div className="view-heading">
        <div>
          <p className="eyebrow">Your list</p>
          <h2 id="ranking-title">Forced ranking</h2>
        </div>
        <p className="view-stat">
          <strong>{ballot.ranking.length}</strong> ranked
        </p>
      </div>

      {ballot.watchedFilmIds.length === 0 ? (
        <div className="empty-state">
          <ListOrdered size={30} strokeWidth={1.5} aria-hidden="true" />
          <h3>No films logged yet</h3>
          <button type="button" onClick={onGoSchedule}>
            Open schedule
          </button>
        </div>
      ) : (
        <>
          {unranked.length > 0 && (
            <section className="unranked-strip" aria-labelledby="unranked-title">
              <h3 id="unranked-title">Waiting to place</h3>
              <div>
                {unranked.map((filmId) => (
                  <button key={filmId} type="button" onClick={() => startPlacement(filmId)}>
                    <Scale size={16} aria-hidden="true" />
                    {SCREENINGS_BY_ID.get(filmId)?.title}
                  </button>
                ))}
              </div>
            </section>
          )}

          <div className="ranking-header">
            <p>Best</p>
            <span>Drag to reorder</span>
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={ballot.ranking}
              strategy={verticalListSortingStrategy}
            >
              <div className="ranking-list">
                {ballot.ranking.map((filmId, index) => (
                  <SortableFilm
                    key={filmId}
                    filmId={filmId}
                    position={index + 1}
                    total={ballot.ranking.length}
                    onMove={move}
                    onReplace={startPlacement}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <div className="ranking-footer">Last place</div>
        </>
      )}

      <PlacementDialog
        placement={placement}
        viewingNotes={ballot.viewingNotes}
        onAnswer={answerComparison}
        onClose={() => setPlacement(null)}
      />
    </section>
  )
}