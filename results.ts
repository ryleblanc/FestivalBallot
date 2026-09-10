import type {
  Nomination,
  ParticipantId,
  RevealedBallot,
} from '../types'

export interface CombinedRank {
  filmId: string
  average: number
  ranks: Partial<Record<ParticipantId, number>>
}

export interface AwardFinalist {
  filmId: string
  nominee: string
  nominationId: string
  nominationOwner: ParticipantId
  supportedBy: ParticipantId[]
  notes: Array<{ participantId: ParticipantId; note: string }>
}

export function combineRankings(ballots: RevealedBallot[]): CombinedRank[] {
  const filmIds = [
    ...new Set(ballots.flatMap(({ ballot }) => ballot.ranking)),
  ]
  const missingRank = Math.max(
    1,
    ...ballots.map(({ ballot }) => ballot.ranking.length + 1),
  )

  return filmIds
    .map((filmId) => {
      const ranks: Partial<Record<ParticipantId, number>> = {}
      const scores = ballots.map(({ participant, ballot }) => {
        const index = ballot.ranking.indexOf(filmId)
        if (index >= 0) ranks[participant.id] = index + 1
        return index >= 0 ? index + 1 : missingRank
      })
      return {
        filmId,
        ranks,
        average: scores.reduce((sum, score) => sum + score, 0) / scores.length,
      }
    })
    .sort((left, right) => left.average - right.average)
}

function finalistKey(nomination: Nomination): string {
  return `${nomination.filmId}\u0000${nomination.nominee.trim().toLocaleLowerCase()}`
}

export function finalistsForCategory(
  ballots: RevealedBallot[],
  categoryId: string,
): AwardFinalist[] {
  const finalists = new Map<string, AwardFinalist>()

  ballots.forEach(({ participant, ballot }) => {
    ballot.nominations
      .filter((nomination) => nomination.categoryId === categoryId)
      .forEach((nomination) => {
        const key = finalistKey(nomination)
        const existing = finalists.get(key)
        if (existing) {
          if (!existing.supportedBy.includes(participant.id)) {
            existing.supportedBy.push(participant.id)
          }
          if (nomination.note) {
            existing.notes.push({
              participantId: participant.id,
              note: nomination.note,
            })
          }
          return
        }

        finalists.set(key, {
          filmId: nomination.filmId,
          nominee: nomination.nominee,
          nominationId: nomination.id,
          nominationOwner: participant.id,
          supportedBy: [participant.id],
          notes: nomination.note
            ? [{ participantId: participant.id, note: nomination.note }]
            : [],
        })
      })
  })

  return [...finalists.values()]
}