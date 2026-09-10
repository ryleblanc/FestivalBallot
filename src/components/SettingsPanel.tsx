import { useState, type FormEvent } from 'react'
import { Download, ExternalLink, Link2, X } from 'lucide-react'
import type { Ballot, Participant, ParticipantId } from '../types'
import { PARTICIPANTS } from '../types'
import type { SyncStatus } from '../hooks/useFestivalBallot'

interface SettingsPanelProps {
  participant: Participant
  ballot: Ballot
  remoteMode: boolean
  apiUrl: string
  syncStatus: SyncStatus
  syncError: string
  onChooseParticipant: (participantId: ParticipantId) => void
  onConfigureApiUrl: (url: string) => void
  onClose: () => void
}

export function SettingsPanel({
  participant,
  ballot,
  remoteMode,
  apiUrl,
  syncStatus,
  syncError,
  onChooseParticipant,
  onConfigureApiUrl,
  onClose,
}: SettingsPanelProps) {
  const [endpoint, setEndpoint] = useState(apiUrl)

  function saveEndpoint(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    onConfigureApiUrl(endpoint)
  }

  function exportBallot(): void {
    const blob = new Blob([JSON.stringify({ participant, ballot }, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${participant.id}-festival-ballot.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div
      className="modal-backdrop settings-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className="settings-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <header>
          <div>
            <p className="eyebrow">Festival Ballot</p>
            <h2 id="settings-title">Settings</h2>
          </div>
          <button
            className="icon-button"
            type="button"
            title="Close settings"
            aria-label="Close settings"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>

        <div className="settings-section">
          <h3>Ballot</h3>
          {remoteMode ? (
            <div className="setting-value">
              <span>Signed in as</span>
              <strong>{participant.name}</strong>
            </div>
          ) : (
            <div className="profile-switch" aria-label="Local ballot profile">
              {Object.values(PARTICIPANTS).map((profile) => (
                <button
                  className={profile.id === participant.id ? 'active' : ''}
                  type="button"
                  key={profile.id}
                  aria-pressed={profile.id === participant.id}
                  onClick={() => onChooseParticipant(profile.id)}
                >
                  {profile.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="settings-section">
          <h3>Sync</h3>
          <div className={`sync-detail ${syncStatus}`}>
            <span />
            {remoteMode ? syncStatus : 'Local preview'}
          </div>
          {syncError && <p className="setting-error">{syncError}</p>}
          {remoteMode && (
            <form className="endpoint-form" onSubmit={saveEndpoint}>
              <label htmlFor="settings-api-url">Apps Script web app URL</label>
              <div>
                <Link2 size={17} aria-hidden="true" />
                <input
                  id="settings-api-url"
                  type="url"
                  value={endpoint}
                  onChange={(event) => setEndpoint(event.target.value)}
                  required
                />
              </div>
              <button type="submit">Save endpoint</button>
            </form>
          )}
        </div>

        <div className="settings-section settings-actions">
          <h3>Data</h3>
          <button type="button" onClick={exportBallot}>
            <Download size={17} aria-hidden="true" />
            Export my ballot
          </button>
          <a
            href="https://2026.tiffr.com/u/leblanc-ryder/schedule"
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink size={17} aria-hidden="true" />
            Open tiffr schedule
          </a>
        </div>
      </section>
    </div>
  )
}