import { useState } from 'react'
import {
  Check,
  Clock3,
  LockKeyhole,
  RefreshCw,
  Sparkles,
  Trophy,
} from 'lucide-react'
import { CATEGORY_GROUPS, OSCAR_CATEGORIES } from '../data/categories'
import { SCREENINGS, SCREENINGS_BY_ID } from '../data/schedule'
import { otherParticipantId } from '../lib/api'
import { updateBallot } from '../lib/ballot'
import { combineRankings, finalistsForCategory } from '../lib/results'
import type {
  Ballot,
  Participant,
  RevealedBallot,
  SharedWinner,
} from '../types'
import { PARTICIPANTS } from '../types'

interface ResultsViewProps {
  participant: Participant
  ballot: Ballot
  partnerReady: boolean
  revealedBallots: RevealedBallot[] | null
  winners: SharedWinner[]
  changeBallot: (updater: (current: Ballot) => Ballot) => void
  chooseWinner: (winner: SharedWinner) => Promise<void>
  refresh: () => Promise<void>
}

export function ResultsView({
  participant,
  ballot,
  partnerReady,
  revealedBallots,
  winners,
  changeBallot,
  chooseWinner,
  refresh,
}: ResultsViewProps) {
  const [section, setSection] = useState<'rankings' | 'awards'>('rankings')
  const [refreshing, setRefreshing] = useState(false)
  const partner = PARTICIPANTS[otherParticipantId(participant.id)]

  async function refreshResults(): Promise<void> {
    setRefreshing(true)
    await refresh()
    setRefreshing(false)
  }

  if (!revealedBallots) {
    const latestFilm =
      SCREENINGS_BY_ID.get(ballot.watchedFilmIds.at(-1) ?? '') ?? SCREENINGS[0]
    return (
      <section className="view results-view" aria-labelledby="results-title">
        <div className="view-heading">
          <div>
            <p className="eyebrow">Festival close</p>
            <h2 id="results-title">The reveal</h2>
          </div>
          <button
            className="icon-button"
            type="button"
            title="Refresh reveal status"
            aria-label="Refresh reveal status"
            onClick={() => void refreshResults()}
          >
            <RefreshCw className={refreshing ? 'spin' : ''} size={18} />
          </button>
        </div>

        <div className="reveal-stage">
          <img
            src={latestFilm.imageUrl}
            alt=""
            referrerPolicy="no-referrer"
          />
          <div className="reveal-shade" />
          <div className="reveal-copy">
            <LockKeyhole size={25} strokeWidth={1.6} aria-hidden="true" />
            <p>Private until both ballots are sealed</p>
            <h3>{ballot.revealReady ? 'Your ballot is sealed.' : 'Ready to compare?'}</h3>
          </div>
        </div>

        <div className="reveal-stats">
          <div>
            <strong>{ballot.watchedFilmIds.length}</strong>
            <span>Watched</span>
          </div>
          <div>
            <strong>{ballot.ranking.length}</strong>
            <span>Ranked</span>
          </div>
          <div>
            <strong>{ballot.nominations.length}</strong>
            <span>Nominated</span>
          </div>
        </div>

        <div className="seal-status">
          <div className={ballot.revealReady ? 'ready' : ''}>
            <span>{ballot.revealReady ? <Check size={17} /> : <Clock3 size={17} />}</span>
            <strong>{participant.name}</strong>
            <small>{ballot.revealReady ? 'Sealed' : 'Editing'}</small>
          </div>
          <div className={partnerReady ? 'ready' : ''}>
            <span>{partnerReady ? <Check size={17} /> : <Clock3 size={17} />}</span>
            <strong>{partner.name}</strong>
            <small>{partnerReady ? 'Sealed' : 'Editing'}</small>
          </div>
        </div>

        <button
          className={ballot.revealReady ? 'secondary-button seal-button' : 'primary-button seal-button'}
          type="button"
          onClick={() =>
            changeBallot((current) =>
              updateBallot(current, { revealReady: !current.revealReady }),
            )
          }
        >
          {ballot.revealReady ? 'Reopen my ballot' : 'Seal my ballot'}
        </button>
      </section>
    )
  }

  const combinedRanking = combineRankings(revealedBallots)
  const validWinners = winners.filter((winner) =>
    revealedBallots.some(
      ({ participant: owner, ballot: ownerBallot }) =>
        owner.id === winner.nominationOwner &&
        ownerBallot.nominations.some(
          (nomination) =>
            nomination.id === winner.nominationId &&
            nomination.categoryId === winner.categoryId &&
            nomination.filmId === winner.filmId &&
            nomination.nominee === winner.nominee,
        ),
    ),
  )
  const winnerCount = validWinners.length

  return (
    <section className="view results-view revealed" aria-labelledby="results-title">
      <div className="view-heading">
        <div>
          <p className="eyebrow">Ballots open</p>
          <h2 id="results-title">Festival results</h2>
        </div>
        <p className="view-stat">
          <strong>{winnerCount}</strong> winners
        </p>
      </div>

      <div className="result-tabs" role="tablist" aria-label="Result views">
        <button
          type="button"
          role="tab"
          aria-selected={section === 'rankings'}
          className={section === 'rankings' ? 'active' : ''}
          onClick={() => setSection('rankings')}
        >
          Combined ranking
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={section === 'awards'}
          className={section === 'awards' ? 'active' : ''}
          onClick={() => setSection('awards')}
        >
          Final awards
        </button>
      </div>

      {section === 'rankings' ? (
        <div className="combined-ranking" role="tabpanel">
          <div className="combined-ranking-header">
            <span>Film</span>
            <span>R</span>
            <span>Y</span>
            <span>Avg.</span>
          </div>
          {combinedRanking.map((item, index) => {
            const film = SCREENINGS_BY_ID.get(item.filmId)
            return (
              <article className="combined-row" key={item.filmId}>
                <span className="rank-number">{index + 1}</span>
                <img src={film?.imageUrl} alt="" referrerPolicy="no-referrer" />
                <strong>{film?.title}</strong>
                <span>{item.ranks.ryder ?? '—'}</span>
                <span>{item.ranks.yashvi ?? '—'}</span>
                <span>{item.average.toFixed(1).replace('.0', '')}</span>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="final-awards" role="tabpanel">
          <div className="awards-progress">
            <Sparkles size={19} aria-hidden="true" />
            <strong>{winnerCount} of 24 decided</strong>
            <span style={{ '--progress': `${(winnerCount / 24) * 100}%` } as React.CSSProperties} />
          </div>
          {CATEGORY_GROUPS.map((group) => (
            <section className="award-group" key={group}>
              <h3>{group}</h3>
              {OSCAR_CATEGORIES.filter((category) => category.group === group).map(
                (category) => {
                  const finalists = finalistsForCategory(revealedBallots, category.id)
                  const winner = validWinners.find(
                    ({ categoryId }) => categoryId === category.id,
                  )
                  return (
                    <article className="award-category" key={category.id}>
                      <header>
                        <h4>{category.name}</h4>
                        {winner && <Trophy size={17} aria-label="Winner chosen" />}
                      </header>
                      {finalists.length === 0 ? (
                        <p className="category-empty">No nominees</p>
                      ) : (
                        <div className="finalist-list">
                          {finalists.map((finalist) => {
                            const film = SCREENINGS_BY_ID.get(finalist.filmId)
                            const selected = Boolean(
                              winner &&
                                winner.filmId === finalist.filmId &&
                                winner.nominee === finalist.nominee,
                            )
                            return (
                              <div
                                className={selected ? 'finalist selected' : 'finalist'}
                                key={`${finalist.filmId}-${finalist.nominee}`}
                              >
                                <img
                                  src={film?.imageUrl}
                                  alt=""
                                  loading="lazy"
                                  referrerPolicy="no-referrer"
                                />
                                <div>
                                  <strong>{finalist.nominee || film?.title}</strong>
                                  {finalist.nominee && <span>{film?.title}</span>}
                                  <small>
                                    {finalist.supportedBy
                                      .map((id) => PARTICIPANTS[id].name)
                                      .join(' + ')}
                                  </small>
                                  {finalist.notes.map(({ participantId, note }) => (
                                    <p className="finalist-note" key={participantId}>
                                      <b>{PARTICIPANTS[participantId].name}:</b> {note}
                                    </p>
                                  ))}
                                </div>
                                <button
                                  type="button"
                                  className={selected ? 'winner-button selected' : 'winner-button'}
                                  onClick={() =>
                                    void chooseWinner({
                                      categoryId: category.id,
                                      filmId: finalist.filmId,
                                      nominee: finalist.nominee,
                                      nominationId: finalist.nominationId,
                                      nominationOwner: finalist.nominationOwner,
                                      updatedAt: new Date().toISOString(),
                                    })
                                  }
                                >
                                  <Trophy size={15} aria-hidden="true" />
                                  {selected ? 'Winner' : 'Choose'}
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </article>
                  )
                },
              )}
            </section>
          ))}
        </div>
      )}
    </section>
  )
}