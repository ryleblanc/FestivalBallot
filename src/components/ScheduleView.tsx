import { useState } from 'react'
import {
  Check,
  ChevronRight,
  Clock3,
  ExternalLink,
  MapPin,
  X,
} from 'lucide-react'
import { SCREENINGS, SCREENINGS_BY_ID } from '../data/schedule'
import {
  dayKey,
  formatDayHeading,
  formatDayTab,
  formatRuntime,
  formatTime,
  runtimeMinutes,
  torontoToday,
} from '../lib/format'
import {
  answerPlacement,
  beginPlacement,
  type PlacementOutcome,
} from '../lib/ranking'
import { removeWatchedFilm, updateBallot } from '../lib/ballot'
import type { Ballot, Screening } from '../types'
import { PlacementDialog } from './PlacementDialog'

interface ScheduleViewProps {
  ballot: Ballot
  changeBallot: (updater: (current: Ballot) => Ballot) => void
  onNominate: (filmId: string) => void
}

interface PlacedFilm {
  filmId: string
  position: number
}

const festivalDays = [...new Set(SCREENINGS.map(({ start }) => dayKey(start)))]

function initialFestivalDay(): string {
  const today = torontoToday()
  if (festivalDays.includes(today)) return today
  return festivalDays.find((day) => day > today) ?? festivalDays.at(-1)!
}

function screeningStatus(screening: Screening, watched: boolean): string {
  if (watched) return 'Watched'
  const now = Date.now()
  if (now >= Date.parse(screening.start) && now <= Date.parse(screening.end)) {
    return 'Now screening'
  }
  if (now > Date.parse(screening.end)) return 'Ready to log'
  return 'Upcoming'
}

export function ScheduleView({
  ballot,
  changeBallot,
  onNominate,
}: ScheduleViewProps) {
  const [selectedDay, setSelectedDay] = useState(initialFestivalDay)
  const [placement, setPlacement] = useState<PlacementOutcome | null>(null)
  const [placedFilm, setPlacedFilm] = useState<PlacedFilm | null>(null)
  const dayScreenings = SCREENINGS.filter(
    ({ start }) => dayKey(start) === selectedDay,
  )
  const feature =
    dayScreenings.find(({ kind }) => kind !== 'event') ?? dayScreenings[0]

  function markWatched(screening: Screening): void {
    if (screening.kind === 'event') return
    if (ballot.watchedFilmIds.includes(screening.id)) {
      const hasDependentData =
        ballot.ranking.includes(screening.id) ||
        ballot.nominations.some(({ filmId }) => filmId === screening.id)
      if (
        hasDependentData &&
        !window.confirm(
          `Remove ${screening.title} from your ranking and nominations?`,
        )
      ) {
        return
      }
      changeBallot((current) => removeWatchedFilm(current, screening.id))
      return
    }

    const outcome = beginPlacement(screening.id, ballot.ranking)
    changeBallot((current) =>
      updateBallot(current, {
        watchedFilmIds: [...current.watchedFilmIds, screening.id],
        ranking: outcome.done ? outcome.ranking : current.ranking,
      }),
    )

    if (outcome.done) {
      setPlacedFilm({ filmId: screening.id, position: outcome.insertionIndex + 1 })
    } else {
      setPlacement(outcome)
    }
  }

  function answerComparison(newFilmRanksHigher: boolean): void {
    if (!placement || placement.done) return
    const outcome = answerPlacement(placement.session, newFilmRanksHigher)
    if (outcome.done) {
      changeBallot((current) => updateBallot(current, { ranking: outcome.ranking }))
      setPlacedFilm({
        filmId: placement.session.filmId,
        position: outcome.insertionIndex + 1,
      })
      setPlacement(null)
      return
    }
    setPlacement(outcome)
  }

  const completedFilm = placedFilm
    ? SCREENINGS_BY_ID.get(placedFilm.filmId)
    : null

  return (
    <section className="view schedule-view" aria-labelledby="schedule-title">
      <div className="view-heading">
        <div>
          <p className="eyebrow">Your itinerary</p>
          <h2 id="schedule-title">Schedule</h2>
        </div>
        <p className="view-stat">
          <strong>{ballot.watchedFilmIds.length}</strong> / 31 watched
        </p>
      </div>

      <div className="day-strip" aria-label="Festival dates">
        {festivalDays.map((day) => {
          const label = formatDayTab(day)
          return (
            <button
              className={day === selectedDay ? 'day-chip active' : 'day-chip'}
              key={day}
              type="button"
              aria-pressed={day === selectedDay}
              onClick={() => setSelectedDay(day)}
            >
              <span>{label.weekday}</span>
              <strong>{label.day}</strong>
            </button>
          )
        })}
      </div>

      {feature && (
        <article className="schedule-feature">
          <img
            src={feature.imageUrl}
            alt={`Still from ${feature.title}`}
            referrerPolicy="no-referrer"
          />
          <div className="schedule-feature-shade" />
          <div className="schedule-feature-copy">
            <p>{formatDayHeading(feature.start)}</p>
            <h3>{feature.title}</h3>
            <span>
              {formatTime(feature.start)} · {feature.venue}
            </span>
          </div>
        </article>
      )}

      <div className="screening-list">
        {dayScreenings.map((screening) => {
          const watched = ballot.watchedFilmIds.includes(screening.id)
          return (
            <article
              className={watched ? 'screening-row watched' : 'screening-row'}
              key={screening.id}
            >
              <img
                className="screening-thumb"
                src={screening.imageUrl}
                alt=""
                loading="lazy"
                referrerPolicy="no-referrer"
              />
              <div className="screening-copy">
                <div className="screening-kicker">
                  <span>{screeningStatus(screening, watched)}</span>
                  {screening.premium && <span>Premium</span>}
                  {screening.kind !== 'film' && <span>{screening.kind}</span>}
                </div>
                <h3>{screening.title}</h3>
                <p>
                  <Clock3 size={14} aria-hidden="true" />
                  {formatTime(screening.start)} ·{' '}
                  {formatRuntime(runtimeMinutes(screening.start, screening.end))}
                </p>
                <p>
                  <MapPin size={14} aria-hidden="true" />
                  {screening.venue}
                </p>
              </div>
              <div className="screening-actions">
                <a
                  className="icon-button subtle"
                  href={screening.pageUrl}
                  target="_blank"
                  rel="noreferrer"
                  title={`Open ${screening.title} on tiffr`}
                  aria-label={`Open ${screening.title} on tiffr`}
                >
                  <ExternalLink size={17} />
                </a>
                {screening.kind !== 'event' && (
                  <button
                    className={watched ? 'watch-button checked' : 'watch-button'}
                    type="button"
                    onClick={() => markWatched(screening)}
                  >
                    {watched ? <Check size={17} /> : <ChevronRight size={17} />}
                    <span>{watched ? 'Watched' : 'Log film'}</span>
                  </button>
                )}
              </div>
            </article>
          )
        })}
      </div>

      <PlacementDialog
        placement={placement}
        onAnswer={answerComparison}
        onClose={() => setPlacement(null)}
      />

      {completedFilm && placedFilm && (
        <div className="toast" role="status">
          <div>
            <span>Ranked #{placedFilm.position}</span>
            <strong>{completedFilm.title}</strong>
          </div>
          <button
            type="button"
            onClick={() => {
              setPlacedFilm(null)
              onNominate(completedFilm.id)
            }}
          >
            Nominate
          </button>
          <button
            className="icon-button"
            type="button"
            aria-label="Dismiss"
            title="Dismiss"
            onClick={() => setPlacedFilm(null)}
          >
            <X size={18} />
          </button>
        </div>
      )}
    </section>
  )
}