import { useState } from 'react'
import {
  Award,
  CalendarDays,
  Cloud,
  CloudOff,
  ListOrdered,
  LoaderCircle,
  Settings,
  Trophy,
} from 'lucide-react'
import './festival.css'
import { IdentityGate } from './components/IdentityGate'
import { NominationsView } from './components/NominationsView'
import { RankingView } from './components/RankingView'
import { ResultsView } from './components/ResultsView'
import { ScheduleView } from './components/ScheduleView'
import { SettingsPanel } from './components/SettingsPanel'
import { useFestivalBallot } from './hooks/useFestivalBallot'

type AppTab = 'schedule' | 'nominations' | 'ranking' | 'results'

const NAV_ITEMS: Array<{
  id: AppTab
  label: string
  icon: typeof CalendarDays
}> = [
  { id: 'schedule', label: 'Watch', icon: CalendarDays },
  { id: 'nominations', label: 'Nominate', icon: Award },
  { id: 'ranking', label: 'Rank', icon: ListOrdered },
  { id: 'results', label: 'Results', icon: Trophy },
]

function App() {
  const store = useFestivalBallot()
  const [activeTab, setActiveTab] = useState<AppTab>('schedule')
  const [nominationFilmId, setNominationFilmId] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  if (!store.participant) {
    if (!store.remoteMode) {
      return <IdentityGate onChoose={store.chooseParticipant} />
    }

    if (store.syncStatus === 'loading') {
      return (
        <main className="connection-gate">
          <LoaderCircle className="spin" size={28} aria-hidden="true" />
          <h1>Opening your ballot</h1>
        </main>
      )
    }

    return (
      <main className="connection-gate">
        <CloudOff size={30} aria-hidden="true" />
        <h1>Connect your ballot</h1>
        <p>{store.syncError}</p>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            store.configureApiUrl(String(form.get('apiUrl') ?? ''))
          }}
        >
          <label htmlFor="api-url">Apps Script web app URL</label>
          <input
            id="api-url"
            name="apiUrl"
            type="url"
            placeholder="https://script.google.com/macros/s/…/exec"
            required
          />
          <button type="submit">Connect</button>
        </form>
      </main>
    )
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <button
          className="brand-button"
          type="button"
          onClick={() => setActiveTab('schedule')}
        >
          <span className="brand-slash" aria-hidden="true" />
          <span>
            <strong>Festival Ballot</strong>
            <small>{store.participant.name}&apos;s ballot</small>
          </span>
        </button>
        <div className="header-actions">
          <span className={`sync-state ${store.syncStatus}`}>
            {store.syncStatus === 'loading' || store.syncStatus === 'saving' ? (
              <LoaderCircle className="spin" size={15} aria-hidden="true" />
            ) : store.syncStatus === 'error' ? (
              <CloudOff size={15} aria-hidden="true" />
            ) : (
              <Cloud size={15} aria-hidden="true" />
            )}
            {store.syncStatus === 'local'
              ? 'On device'
              : store.syncStatus === 'saving'
                ? 'Saving'
                : store.syncStatus === 'error'
                  ? 'Offline'
                  : 'Synced'}
          </span>
          <button
            className="icon-button"
            type="button"
            title="Settings"
            aria-label="Open settings"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings size={19} />
          </button>
        </div>
      </header>

      <main className="app-main">
        {activeTab === 'schedule' && (
          <ScheduleView
            ballot={store.ballot}
            changeBallot={store.changeBallot}
            onNominate={(filmId) => {
              setNominationFilmId(filmId)
              setActiveTab('nominations')
            }}
          />
        )}
        {activeTab === 'nominations' && (
          <NominationsView
            key={nominationFilmId ?? 'nominations'}
            ballot={store.ballot}
            initialFilmId={nominationFilmId}
            changeBallot={store.changeBallot}
            onConsumeInitialFilm={() => setNominationFilmId(null)}
            onGoSchedule={() => setActiveTab('schedule')}
          />
        )}
        {activeTab === 'ranking' && (
          <RankingView
            ballot={store.ballot}
            changeBallot={store.changeBallot}
            onGoSchedule={() => setActiveTab('schedule')}
          />
        )}
        {activeTab === 'results' && (
          <ResultsView
            participant={store.participant}
            ballot={store.ballot}
            partnerReady={store.partnerReady}
            revealedBallots={store.revealedBallots}
            winners={store.winners}
            changeBallot={store.changeBallot}
            chooseWinner={store.chooseWinner}
            refresh={store.refresh}
          />
        )}
      </main>

      <nav className="bottom-nav" aria-label="Primary navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <button
              className={activeTab === item.id ? 'active' : ''}
              key={item.id}
              type="button"
              aria-current={activeTab === item.id ? 'page' : undefined}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon size={21} strokeWidth={1.8} aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      {settingsOpen && (
        <SettingsPanel
          participant={store.participant}
          ballot={store.ballot}
          remoteMode={store.remoteMode}
          apiUrl={store.apiUrl}
          syncStatus={store.syncStatus}
          syncError={store.syncError}
          onChooseParticipant={store.chooseParticipant}
          onConfigureApiUrl={store.configureApiUrl}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  )
}

export default App
