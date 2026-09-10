export type ParticipantId = 'ryder' | 'yashvi'

export type ScreeningKind = 'film' | 'series' | 'event'

export interface Screening {
  id: string
  title: string
  start: string
  end: string
  venue: string
  kind: ScreeningKind
  premium?: boolean
  imageUrl: string
  pageUrl: string
}

export type CategoryGroup =
  | 'Top awards'
  | 'Performances'
  | 'Writing'
  | 'Craft'
  | 'Features'
  | 'Short films'

export interface OscarCategory {
  id: string
  name: string
  shortName: string
  group: CategoryGroup
  detailLabel?: string
  detailPlaceholder?: string
}

export interface Nomination {
  id: string
  categoryId: string
  filmId: string
  nominee: string
  note: string
  createdAt: string
}

export interface Ballot {
  version: 1
  watchedFilmIds: string[]
  viewingNotes: Record<string, string>
  ranking: string[]
  nominations: Nomination[]
  revealReady: boolean
  updatedAt: string
}

export interface SharedWinner {
  categoryId: string
  filmId: string
  nominee: string
  nominationOwner: ParticipantId
  nominationId: string
  updatedAt: string
}

export interface Participant {
  id: ParticipantId
  name: string
}

export interface RevealedBallot {
  participant: Participant
  ballot: Ballot
}

export interface SyncSnapshot {
  participant: Participant
  ballot: Ballot
  partnerReady: boolean
  revealedBallots: RevealedBallot[] | null
  winners: SharedWinner[]
}

export const PARTICIPANTS: Record<ParticipantId, Participant> = {
  ryder: { id: 'ryder', name: 'Ryder' },
  yashvi: { id: 'yashvi', name: 'Yashvi' },
}

export function createEmptyBallot(): Ballot {
  return {
    version: 1,
    watchedFilmIds: [],
    viewingNotes: {},
    ranking: [],
    nominations: [],
    revealReady: false,
    updatedAt: new Date(0).toISOString(),
  }
}