import { OSCAR_CATEGORIES } from '../data/categories'
import { RANKABLE_SCREENINGS } from '../data/schedule'
import type { Ballot, Nomination } from '../types'
import { createEmptyBallot } from '../types'

const validFilmIds = new Set(RANKABLE_SCREENINGS.map((screening) => screening.id))
const validCategoryIds = new Set(OSCAR_CATEGORIES.map((category) => category.id))

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function uniqueStrings(value: unknown, allowed?: Set<string>): string[] {
  if (!Array.isArray(value)) return []

  return [...new Set(value)].filter(
    (item): item is string =>
      typeof item === 'string' && (!allowed || allowed.has(item)),
  )
}

function normalizeNomination(
  value: unknown,
  watchedFilmIds: Set<string>,
): Nomination | null {
  if (!isRecord(value)) return null

  const { id, categoryId, filmId, nominee, note, createdAt } = value
  if (
    typeof id !== 'string' ||
    typeof categoryId !== 'string' ||
    !validCategoryIds.has(categoryId) ||
    typeof filmId !== 'string' ||
    !watchedFilmIds.has(filmId)
  ) {
    return null
  }

  return {
    id,
    categoryId,
    filmId,
    nominee: typeof nominee === 'string' ? nominee.slice(0, 160) : '',
    note: typeof note === 'string' ? note.slice(0, 500) : '',
    createdAt:
      typeof createdAt === 'string' ? createdAt : new Date(0).toISOString(),
  }
}

export function normalizeBallot(value: unknown): Ballot {
  if (!isRecord(value)) return createEmptyBallot()

  const watchedFilmIds = uniqueStrings(value.watchedFilmIds, validFilmIds)
  const watched = new Set(watchedFilmIds)
  const ranking = uniqueStrings(value.ranking, watched)
  const nominations = Array.isArray(value.nominations)
    ? value.nominations
        .map((nomination) => normalizeNomination(nomination, watched))
        .filter((nomination): nomination is Nomination => nomination !== null)
    : []

  return {
    version: 1,
    watchedFilmIds,
    ranking,
    nominations,
    revealReady: value.revealReady === true,
    updatedAt:
      typeof value.updatedAt === 'string'
        ? value.updatedAt
        : new Date(0).toISOString(),
  }
}

export function updateBallot(
  ballot: Ballot,
  changes: Partial<Omit<Ballot, 'version' | 'updatedAt'>>,
): Ballot {
  return normalizeBallot({
    ...ballot,
    ...changes,
    updatedAt: new Date().toISOString(),
  })
}

export function removeWatchedFilm(ballot: Ballot, filmId: string): Ballot {
  return updateBallot(ballot, {
    watchedFilmIds: ballot.watchedFilmIds.filter((id) => id !== filmId),
    ranking: ballot.ranking.filter((id) => id !== filmId),
    nominations: ballot.nominations.filter(
      (nomination) => nomination.filmId !== filmId,
    ),
  })
}

export function createNomination(
  categoryId: string,
  filmId: string,
  nominee: string,
  note: string,
): Nomination {
  return {
    id: crypto.randomUUID(),
    categoryId,
    filmId,
    nominee: nominee.trim(),
    note: note.trim(),
    createdAt: new Date().toISOString(),
  }
}