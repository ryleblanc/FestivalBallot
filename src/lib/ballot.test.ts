import { describe, expect, it } from 'vitest'
import { normalizeBallot, removeWatchedFilm, updateBallot } from './ballot'

describe('normalizeBallot', () => {
  it('returns an empty ballot for invalid input', () => {
    expect(normalizeBallot(null)).toMatchObject({
      version: 1,
      watchedFilmIds: [],
      ranking: [],
      nominations: [],
      revealReady: false,
    })
  })

  it('removes unknown films, duplicates, and orphaned nominations', () => {
    const ballot = normalizeBallot({
      watchedFilmIds: ['hope', 'hope', 'not-a-film', 'fjord'],
      ranking: ['fjord', 'unknown', 'fjord', 'hope'],
      nominations: [
        {
          id: 'valid',
          categoryId: 'picture',
          filmId: 'hope',
          nominee: '',
          note: 'A strong pick',
          createdAt: '2026-09-09T22:00:00.000Z',
        },
        {
          id: 'unwatched',
          categoryId: 'picture',
          filmId: 'river',
        },
        {
          id: 'bad-category',
          categoryId: 'best-snacks',
          filmId: 'hope',
        },
      ],
      revealReady: true,
      updatedAt: '2026-09-09T22:00:00.000Z',
    })

    expect(ballot.watchedFilmIds).toEqual(['hope', 'fjord'])
    expect(ballot.ranking).toEqual(['fjord', 'hope'])
    expect(ballot.nominations.map(({ id }) => id)).toEqual(['valid'])
    expect(ballot.revealReady).toBe(true)
  })
})

describe('ballot mutations', () => {
  it('timestamps and normalizes updates', () => {
    const ballot = normalizeBallot({ watchedFilmIds: ['hope'] })
    const updated = updateBallot(ballot, {
      ranking: ['unknown', 'hope', 'hope'],
    })

    expect(updated.ranking).toEqual(['hope'])
    expect(Date.parse(updated.updatedAt)).not.toBeNaN()
  })

  it('removes a film and its dependent data together', () => {
    const ballot = normalizeBallot({
      watchedFilmIds: ['hope', 'fjord'],
      ranking: ['hope', 'fjord'],
      nominations: [
        {
          id: 'one',
          categoryId: 'picture',
          filmId: 'hope',
          nominee: '',
          note: '',
          createdAt: '2026-09-09T22:00:00.000Z',
        },
      ],
    })

    expect(removeWatchedFilm(ballot, 'hope')).toMatchObject({
      watchedFilmIds: ['fjord'],
      ranking: ['fjord'],
      nominations: [],
    })
  })
})