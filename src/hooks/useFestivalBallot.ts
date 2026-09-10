import { useEffect, useRef, useState } from 'react'
import type {
  Ballot,
  Participant,
  ParticipantId,
  RevealedBallot,
  SharedWinner,
  SyncSnapshot,
} from '../types'
import { PARTICIPANTS, createEmptyBallot } from '../types'
import { fetchSnapshot, otherParticipantId, saveRemoteBallot, saveRemoteWinner } from '../lib/api'
import {
  loadApiUrl,
  loadLocalBallot,
  loadLocalWinners,
  loadSelectedParticipant,
  saveApiUrl,
  saveLocalBallot,
  saveLocalWinners,
  saveSelectedParticipant,
} from '../lib/storage'

export type SyncStatus = 'local' | 'loading' | 'saved' | 'saving' | 'error'

function getInviteToken(): string {
  return new URLSearchParams(window.location.search).get('key')?.trim() ?? ''
}

function localRevealState(
  participant: Participant,
  currentBallot: Ballot,
): Pick<SyncSnapshot, 'partnerReady' | 'revealedBallots'> {
  const partnerId = otherParticipantId(participant.id)
  const partnerBallot = loadLocalBallot(partnerId)
  const bothReady = currentBallot.revealReady && partnerBallot.revealReady

  return {
    partnerReady: partnerBallot.revealReady,
    revealedBallots: bothReady
      ? [
          { participant, ballot: currentBallot },
          { participant: PARTICIPANTS[partnerId], ballot: partnerBallot },
        ]
      : null,
  }
}

export function useFestivalBallot() {
  const [inviteToken] = useState(getInviteToken)
  const [apiUrl, setApiUrl] = useState(loadApiUrl)
  const remoteMode = Boolean(inviteToken)
  const initialParticipantId = remoteMode ? null : loadSelectedParticipant()
  const [participant, setParticipant] = useState<Participant | null>(() =>
    initialParticipantId ? PARTICIPANTS[initialParticipantId] : null,
  )
  const [ballot, setBallot] = useState<Ballot>(() =>
    initialParticipantId
      ? loadLocalBallot(initialParticipantId)
      : createEmptyBallot(),
  )
  const [partnerReady, setPartnerReady] = useState(false)
  const [revealedBallots, setRevealedBallots] = useState<
    RevealedBallot[] | null
  >(null)
  const [winners, setWinners] = useState<SharedWinner[]>(loadLocalWinners)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(
    remoteMode ? (apiUrl ? 'loading' : 'error') : 'local',
  )
  const [syncError, setSyncError] = useState(
    remoteMode && !apiUrl
      ? 'Add the Google Apps Script URL to connect this invite link.'
      : '',
  )
  const hydrated = useRef(!remoteMode)
  const lastRemoteUpdate = useRef('')

  function applySnapshot(snapshot: SyncSnapshot): void {
    const localBallot = loadLocalBallot(snapshot.participant.id)
    const useLocal =
      Date.parse(localBallot.updatedAt) > Date.parse(snapshot.ballot.updatedAt)
    const nextBallot = useLocal ? localBallot : snapshot.ballot

    setParticipant(snapshot.participant)
    setBallot(nextBallot)
    setPartnerReady(snapshot.partnerReady)
    setRevealedBallots(snapshot.revealedBallots)
    setWinners(snapshot.winners)
    saveLocalBallot(snapshot.participant.id, nextBallot)
    saveLocalWinners(snapshot.winners)
    lastRemoteUpdate.current = snapshot.ballot.updatedAt
    hydrated.current = true
  }

  useEffect(() => {
    if (!remoteMode) return
    if (!apiUrl) return

    const controller = new AbortController()
    fetchSnapshot(apiUrl, inviteToken, controller.signal)
      .then((snapshot) => {
        applySnapshot(snapshot)
        setSyncStatus('saved')
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setSyncStatus('error')
        setSyncError(
          error instanceof Error ? error.message : 'Could not load the ballot.',
        )
      })

    return () => controller.abort()
  }, [apiUrl, inviteToken, remoteMode])

  useEffect(() => {
    if (!participant || !hydrated.current) return
    saveLocalBallot(participant.id, ballot)

    if (!remoteMode) {
      return
    }

    if (!apiUrl || ballot.updatedAt === lastRemoteUpdate.current) return
    const timeout = window.setTimeout(() => {
      setSyncStatus('saving')
      saveRemoteBallot(apiUrl, inviteToken, ballot)
        .then((snapshot) => {
          lastRemoteUpdate.current = snapshot.ballot.updatedAt
          setPartnerReady(snapshot.partnerReady)
          setRevealedBallots(snapshot.revealedBallots)
          setWinners(snapshot.winners)
          saveLocalWinners(snapshot.winners)
          setSyncStatus('saved')
          setSyncError('')
        })
        .catch((error: unknown) => {
          setSyncStatus('error')
          setSyncError(
            error instanceof Error ? error.message : 'Could not save the ballot.',
          )
        })
    }, 350)

    return () => window.clearTimeout(timeout)
  }, [apiUrl, ballot, inviteToken, participant, remoteMode])

  function chooseParticipant(participantId: ParticipantId): void {
    const nextParticipant = PARTICIPANTS[participantId]
    const nextBallot = loadLocalBallot(participantId)
    saveSelectedParticipant(participantId)
    setParticipant(nextParticipant)
    setBallot(nextBallot)
    const revealState = localRevealState(nextParticipant, nextBallot)
    setPartnerReady(revealState.partnerReady)
    setRevealedBallots(revealState.revealedBallots)
  }

  function changeBallot(updater: (current: Ballot) => Ballot): void {
    setBallot((current) => {
      const next = updater(current)
      if (participant) saveLocalBallot(participant.id, next)
      return next
    })
  }

  async function refresh(): Promise<void> {
    if (!remoteMode || !apiUrl) {
      if (participant) {
        const revealState = localRevealState(participant, ballot)
        setPartnerReady(revealState.partnerReady)
        setRevealedBallots(revealState.revealedBallots)
        setWinners(loadLocalWinners())
      }
      return
    }

    setSyncStatus('loading')
    try {
      const snapshot = await fetchSnapshot(apiUrl, inviteToken)
      applySnapshot(snapshot)
      setSyncStatus('saved')
      setSyncError('')
    } catch (error) {
      setSyncStatus('error')
      setSyncError(
        error instanceof Error ? error.message : 'Could not refresh the ballot.',
      )
    }
  }

  async function chooseWinner(winner: SharedWinner): Promise<void> {
    const nextWinners = [
      ...winners.filter((item) => item.categoryId !== winner.categoryId),
      winner,
    ]
    setWinners(nextWinners)
    saveLocalWinners(nextWinners)

    if (!remoteMode || !apiUrl) return
    setSyncStatus('saving')
    try {
      const snapshot = await saveRemoteWinner(apiUrl, inviteToken, winner)
      setWinners(snapshot.winners)
      saveLocalWinners(snapshot.winners)
      setSyncStatus('saved')
    } catch (error) {
      setSyncStatus('error')
      setSyncError(
        error instanceof Error ? error.message : 'Could not save the winner.',
      )
    }
  }

  function configureApiUrl(url: string): void {
    const nextUrl = url.trim()
    saveApiUrl(nextUrl)
    setApiUrl(nextUrl)
    if (remoteMode && nextUrl) {
      setSyncStatus('loading')
      setSyncError('')
    }
  }

  const localReveal =
    !remoteMode && participant
      ? localRevealState(participant, ballot)
      : null

  return {
    participant,
    ballot,
    partnerReady: localReveal?.partnerReady ?? partnerReady,
    revealedBallots: localReveal?.revealedBallots ?? revealedBallots,
    winners,
    syncStatus,
    syncError,
    remoteMode,
    apiUrl,
    chooseParticipant,
    changeBallot,
    chooseWinner,
    configureApiUrl,
    refresh,
  }
}