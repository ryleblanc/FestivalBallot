export interface PlacementSession {
  filmId: string
  ranking: string[]
  low: number
  high: number
}

export type PlacementOutcome =
  | {
      done: false
      session: PlacementSession
      compareWithId: string
    }
  | {
      done: true
      ranking: string[]
      insertionIndex: number
    }

function nextPlacement(session: PlacementSession): PlacementOutcome {
  if (session.low >= session.high) {
    const ranking = [...session.ranking]
    ranking.splice(session.low, 0, session.filmId)
    return { done: true, ranking, insertionIndex: session.low }
  }

  const comparisonIndex = Math.floor((session.low + session.high) / 2)
  return {
    done: false,
    session,
    compareWithId: session.ranking[comparisonIndex],
  }
}

export function beginPlacement(
  filmId: string,
  currentRanking: string[],
): PlacementOutcome {
  const ranking = currentRanking.filter((id) => id !== filmId)
  return nextPlacement({ filmId, ranking, low: 0, high: ranking.length })
}

export function answerPlacement(
  session: PlacementSession,
  newFilmRanksHigher: boolean,
): PlacementOutcome {
  const comparisonIndex = Math.floor((session.low + session.high) / 2)
  return nextPlacement({
    ...session,
    low: newFilmRanksHigher ? session.low : comparisonIndex + 1,
    high: newFilmRanksHigher ? comparisonIndex : session.high,
  })
}

export function moveInRanking(
  ranking: string[],
  filmId: string,
  direction: -1 | 1,
): string[] {
  const currentIndex = ranking.indexOf(filmId)
  const nextIndex = currentIndex + direction

  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= ranking.length) {
    return ranking
  }

  const nextRanking = [...ranking]
  const [movedFilm] = nextRanking.splice(currentIndex, 1)
  nextRanking.splice(nextIndex, 0, movedFilm)
  return nextRanking
}