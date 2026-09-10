import { describe, expect, it } from 'vitest'
import type { RevealedBallot } from '../types'
import { PARTICIPANTS, createEmptyBallot } from '../types'
import { combineRankings, finalistsForCategory } from './results'

const ballots: RevealedBallot[] = [
  {
    participant: PARTICIPANTS.ryder,
    ballot: {
      ...createEmptyBallot(),
      watchedFilmIds: ['hope', 'fjord', 'river'],
      ranking: ['hope', 'fjord', 'river'],
      nominations: [
        {
          id: 'r1',
          categoryId: 'picture',
          filmId: 'hope',
          nominee: '',
          note: 'Huge swing',
          createdAt: '2026-09-09T22:00:00.000Z',
        },
      ],
    },
  },
  {
    participant: PARTICIPANTS.yashvi,
    ballot: {
      ...createEmptyBallot(),
      watchedFilmIds: ['hope', 'fjord'],
      ranking: ['fjord', 'hope'],
      nominations: [
        {
          id: 'y1',
          categoryId: 'picture',
          filmId: 'hope',
          nominee: '',
          note: 'Could not stop thinking about it',
          createdAt: '2026-09-09T22:05:00.000Z',
        },
      ],
    },
  },
]

describe('combineRankings', () => {
  it('orders films by average rank and penalizes a missing rank', () => {
    expect(combineRankings(ballots)).toEqual([
      { filmId: 'hope', average: 1.5, ranks: { ryder: 1, yashvi: 2 } },
      { filmId: 'fjord', average: 1.5, ranks: { ryder: 2, yashvi: 1 } },
      { filmId: 'river', average: 3.5, ranks: { ryder: 3 } },
    ])
  })
})

describe('finalistsForCategory', () => {
  it('collapses matching picks and preserves both notes', () => {
    expect(finalistsForCategory(ballots, 'picture')).toEqual([
      {
        filmId: 'hope',
        nominee: '',
        nominationId: 'r1',
        nominationOwner: 'ryder',
        supportedBy: ['ryder', 'yashvi'],
        notes: [
          { participantId: 'ryder', note: 'Huge swing' },
          {
            participantId: 'yashvi',
            note: 'Could not stop thinking about it',
          },
        ],
      },
    ])
  })
})