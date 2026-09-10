import type { Ballot, ParticipantId, SharedWinner } from '../types'
import { createEmptyBallot } from '../types'
import { normalizeBallot } from './ballot'

const BALLOT_PREFIX = 'festival-ballot:ballot:'
const PARTICIPANT_KEY = 'festival-ballot:participant'
const WINNERS_KEY = 'festival-ballot:winners'
const API_URL_KEY = 'festival-ballot:api-url'

function readJson(key: string): unknown {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) : null
  } catch {
    return null
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // The in-memory ballot remains usable when storage is unavailable.
  }
}

export function loadLocalBallot(participantId: ParticipantId): Ballot {
  const value = readJson(`${BALLOT_PREFIX}${participantId}`)
  return value ? normalizeBallot(value) : createEmptyBallot()
}

export function saveLocalBallot(
  participantId: ParticipantId,
  ballot: Ballot,
): void {
  writeJson(`${BALLOT_PREFIX}${participantId}`, ballot)
}

export function loadSelectedParticipant(): ParticipantId | null {
  try {
    const value = localStorage.getItem(PARTICIPANT_KEY)
    return value === 'ryder' || value === 'yashvi' ? value : null
  } catch {
    return null
  }
}

export function saveSelectedParticipant(participantId: ParticipantId): void {
  try {
    localStorage.setItem(PARTICIPANT_KEY, participantId)
  } catch {
    // Selection remains available for the current page session.
  }
}

export function loadLocalWinners(): SharedWinner[] {
  const value = readJson(WINNERS_KEY)
  return Array.isArray(value) ? (value as SharedWinner[]) : []
}

export function saveLocalWinners(winners: SharedWinner[]): void {
  writeJson(WINNERS_KEY, winners)
}

export function loadApiUrl(): string {
  const buildTimeUrl = import.meta.env.VITE_SHEETS_API_URL?.trim()
  if (buildTimeUrl) return buildTimeUrl

  try {
    return localStorage.getItem(API_URL_KEY)?.trim() ?? ''
  } catch {
    return ''
  }
}

export function saveApiUrl(url: string): void {
  try {
    if (url) {
      localStorage.setItem(API_URL_KEY, url)
    } else {
      localStorage.removeItem(API_URL_KEY)
    }
  } catch {
    // The build-time URL can still be used when storage is unavailable.
  }
}