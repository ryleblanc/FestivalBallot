import type {
  Ballot,
  Participant,
  ParticipantId,
  RevealedBallot,
  SharedWinner,
  SyncSnapshot,
} from '../types'
import { PARTICIPANTS } from '../types'
import { normalizeBallot } from './ballot'

interface ApiEnvelope {
  ok?: boolean
  error?: string
  participant?: unknown
  ballot?: unknown
  partnerReady?: unknown
  revealedBallots?: unknown
  winners?: unknown
}

function parseParticipant(value: unknown): Participant {
  if (!value || typeof value !== 'object') {
    throw new Error('The sync service returned an invalid participant.')
  }

  const id = (value as { id?: unknown }).id
  if (id !== 'ryder' && id !== 'yashvi') {
    throw new Error('This invite link is not assigned to a participant.')
  }

  return PARTICIPANTS[id]
}

function parseRevealedBallots(value: unknown): RevealedBallot[] | null {
  if (value === null || value === undefined) return null
  if (!Array.isArray(value)) {
    throw new Error('The revealed ballot response is invalid.')
  }

  return value.map((entry) => {
    if (!entry || typeof entry !== 'object') {
      throw new Error('A revealed ballot is invalid.')
    }
    const record = entry as { participant?: unknown; ballot?: unknown }
    return {
      participant: parseParticipant(record.participant),
      ballot: normalizeBallot(record.ballot),
    }
  })
}

function parseWinners(value: unknown): SharedWinner[] {
  if (!Array.isArray(value)) return []
  return value.filter((winner): winner is SharedWinner => {
    if (!winner || typeof winner !== 'object') return false
    const candidate = winner as Partial<SharedWinner>
    return (
      typeof candidate.categoryId === 'string' &&
      typeof candidate.filmId === 'string' &&
      typeof candidate.nominee === 'string' &&
      (candidate.nominationOwner === 'ryder' ||
        candidate.nominationOwner === 'yashvi') &&
      typeof candidate.nominationId === 'string' &&
      typeof candidate.updatedAt === 'string'
    )
  })
}

function parseSnapshot(value: ApiEnvelope): SyncSnapshot {
  if (!value.ok) {
    throw new Error(value.error || 'The sync service rejected the request.')
  }

  return {
    participant: parseParticipant(value.participant),
    ballot: normalizeBallot(value.ballot),
    partnerReady: value.partnerReady === true,
    revealedBallots: parseRevealedBallots(value.revealedBallots),
    winners: parseWinners(value.winners),
  }
}

async function parseResponse(response: Response): Promise<SyncSnapshot> {
  if (!response.ok) {
    throw new Error(`Sync failed with status ${response.status}.`)
  }

  const value = (await response.json()) as ApiEnvelope
  return parseSnapshot(value)
}

export async function fetchSnapshot(
  apiUrl: string,
  token: string,
  signal?: AbortSignal,
): Promise<SyncSnapshot> {
  const url = new URL(apiUrl)
  url.searchParams.set('token', token)
  return parseResponse(
    await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
      signal,
    }),
  )
}

async function postAction(
  apiUrl: string,
  payload: Record<string, unknown>,
): Promise<SyncSnapshot> {
  return parseResponse(
    await fetch(apiUrl, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      referrerPolicy: 'no-referrer',
    }),
  )
}

export function saveRemoteBallot(
  apiUrl: string,
  token: string,
  ballot: Ballot,
): Promise<SyncSnapshot> {
  return postAction(apiUrl, { action: 'saveBallot', token, ballot })
}

export function saveRemoteWinner(
  apiUrl: string,
  token: string,
  winner: SharedWinner,
): Promise<SyncSnapshot> {
  return postAction(apiUrl, { action: 'saveWinner', token, winner })
}

export function otherParticipantId(
  participantId: ParticipantId,
): ParticipantId {
  return participantId === 'ryder' ? 'yashvi' : 'ryder'
}