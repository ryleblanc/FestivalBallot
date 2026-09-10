const BALLOTS_SHEET = 'Ballots'
const WINNERS_SHEET = 'Winners'
const PARTICIPANTS = {
  ryder: { id: 'ryder', name: 'Ryder' },
  yashvi: { id: 'yashvi', name: 'Yashvi' },
}

const VALID_FILM_IDS = new Set([
  'hope',
  'stuffed',
  'fjord',
  'le-faux-soir',
  'glaxo',
  'river',
  'the-face-of-horror',
  'evil-genius',
  'your-mother-your-mother-your-mother',
  'the-debut',
  'alpha-gang',
  'the-spiral',
  'bucking-fastard',
  'wild-horse-nine',
  'bunker',
  'ink',
  'atonement',
  'tenzing',
  'ladies-and-gentlemen-brian-mulroney',
  'the-only-living-pickpocket-in-new-york',
  'the-assassin-s',
  'phoolan',
  'ten-dark-women',
  'crystal-lake',
  'arrested-memory',
  'spirit-guardians',
  'carrie',
  'half',
  'below',
  'misty-green',
  'paradise-lost',
])

const VALID_CATEGORY_IDS = new Set([
  'picture',
  'director',
  'actor-leading',
  'actress-leading',
  'actor-supporting',
  'actress-supporting',
  'original-screenplay',
  'adapted-screenplay',
  'cinematography',
  'costume-design',
  'film-editing',
  'makeup-hairstyling',
  'production-design',
  'sound',
  'visual-effects',
  'original-score',
  'original-song',
  'casting',
  'animated-feature',
  'international-feature',
  'documentary-feature',
  'animated-short',
  'documentary-short',
  'live-action-short',
])

function doGet(event) {
  return respondSafely_(function () {
    const participantId = authenticate_(event.parameter.token)
    return snapshotFor_(participantId)
  })
}

function doPost(event) {
  return respondSafely_(function () {
    const contents = event.postData && event.postData.contents
    if (!contents || contents.length > 500000) {
      throw new Error('Invalid request body.')
    }

    const payload = JSON.parse(contents)
    const participantId = authenticate_(payload.token)
    const lock = LockService.getScriptLock()
    lock.waitLock(10000)

    try {
      if (payload.action === 'saveBallot') {
        saveBallot_(participantId, sanitizeBallot_(payload.ballot))
      } else if (payload.action === 'saveWinner') {
        if (!bothBallotsReady_()) {
          throw new Error('Both ballots must be sealed before choosing winners.')
        }
        saveWinner_(sanitizeWinner_(payload.winner))
      } else {
        throw new Error('Unknown action.')
      }

      return snapshotFor_(participantId)
    } finally {
      lock.releaseLock()
    }
  })
}

function setupFestivalBallot() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet()
  if (!spreadsheet) {
    throw new Error('Open Apps Script from the Festival Ballot Google Sheet, then run setup again.')
  }

  const properties = PropertiesService.getScriptProperties()
  if (
    properties.getProperty('RYDER_TOKEN_HASH') ||
    properties.getProperty('YASHVI_TOKEN_HASH')
  ) {
    throw new Error('Invite keys already exist. Run rotateInviteKeys only if you intend to replace them.')
  }

  properties.setProperty('SPREADSHEET_ID', spreadsheet.getId())
  initializeSheets_()
  const keys = createInviteKeys_()
  console.log('Ryder invite key: ' + keys.ryder)
  console.log('Yashvi invite key: ' + keys.yashvi)
  return keys
}

function rotateInviteKeys() {
  const properties = PropertiesService.getScriptProperties()
  if (!properties.getProperty('SPREADSHEET_ID')) {
    throw new Error('Run setupFestivalBallot first.')
  }

  const keys = createInviteKeys_()
  console.log('NEW Ryder invite key: ' + keys.ryder)
  console.log('NEW Yashvi invite key: ' + keys.yashvi)
  return keys
}

function createInviteKeys_() {
  const keys = {
    ryder: randomToken_(),
    yashvi: randomToken_(),
  }
  PropertiesService.getScriptProperties().setProperties({
    RYDER_TOKEN_HASH: hashToken_(keys.ryder),
    YASHVI_TOKEN_HASH: hashToken_(keys.yashvi),
  })
  return keys
}

function randomToken_() {
  return (
    Utilities.getUuid().replace(/-/g, '') +
    Utilities.getUuid().replace(/-/g, '')
  )
}

function hashToken_(token) {
  if (typeof token !== 'string' || token.length < 32) return ''
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    token,
    Utilities.Charset.UTF_8,
  )
  return Utilities.base64EncodeWebSafe(digest).replace(/=+$/, '')
}

function authenticate_(token) {
  const hash = hashToken_(token)
  const properties = PropertiesService.getScriptProperties()
  if (hash && hash === properties.getProperty('RYDER_TOKEN_HASH')) return 'ryder'
  if (hash && hash === properties.getProperty('YASHVI_TOKEN_HASH')) return 'yashvi'
  throw new Error('Invalid or expired invite key.')
}

function emptyBallot_() {
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

function sanitizeBallot_(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid ballot.')
  }

  const watchedFilmIds = uniqueAllowedStrings_(value.watchedFilmIds, VALID_FILM_IDS)
  const watched = new Set(watchedFilmIds)
  const viewingNotes = sanitizeViewingNotes_(value.viewingNotes, watchedFilmIds)
  const ranking = uniqueAllowedStrings_(value.ranking, watched)
  const nominations = Array.isArray(value.nominations)
    ? value.nominations
        .slice(0, 500)
        .map(function (nomination) {
          return sanitizeNomination_(nomination, watched)
        })
        .filter(function (nomination) {
          return nomination !== null
        })
    : []

  return {
    version: 1,
    watchedFilmIds: watchedFilmIds,
    viewingNotes: viewingNotes,
    ranking: ranking,
    nominations: nominations,
    revealReady: value.revealReady === true,
    updatedAt: new Date().toISOString(),
  }
}

function sanitizeViewingNotes_(value, watchedFilmIds) {
  const viewingNotes = {}
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return viewingNotes
  }

  watchedFilmIds.forEach(function (filmId) {
    const note = cleanString_(value[filmId], 2000)
    if (note) viewingNotes[filmId] = note
  })
  return viewingNotes
}

function sanitizeNomination_(value, watched) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  if (
    typeof value.id !== 'string' ||
    value.id.length > 100 ||
    !VALID_CATEGORY_IDS.has(value.categoryId) ||
    !watched.has(value.filmId)
  ) {
    return null
  }

  return {
    id: value.id,
    categoryId: value.categoryId,
    filmId: value.filmId,
    nominee: cleanString_(value.nominee, 160),
    note: cleanString_(value.note, 500),
    createdAt:
      typeof value.createdAt === 'string'
        ? value.createdAt.slice(0, 40)
        : new Date().toISOString(),
  }
}

function sanitizeWinner_(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid winner.')
  }
  if (
    !VALID_CATEGORY_IDS.has(value.categoryId) ||
    !VALID_FILM_IDS.has(value.filmId) ||
    (value.nominationOwner !== 'ryder' && value.nominationOwner !== 'yashvi') ||
    typeof value.nominationId !== 'string'
  ) {
    throw new Error('Invalid winner.')
  }

  const ballots = readAllBallots_()
  const ownerBallot = ballots[value.nominationOwner]
  const matchingNomination = ownerBallot.nominations.some(function (nomination) {
    return (
      nomination.id === value.nominationId &&
      nomination.categoryId === value.categoryId &&
      nomination.filmId === value.filmId &&
      nomination.nominee === cleanString_(value.nominee, 160)
    )
  })
  if (!matchingNomination) {
    throw new Error('The selected winner is not a revealed nominee.')
  }

  return {
    categoryId: value.categoryId,
    filmId: value.filmId,
    nominee: cleanString_(value.nominee, 160),
    nominationOwner: value.nominationOwner,
    nominationId: value.nominationId,
    updatedAt: new Date().toISOString(),
  }
}

function uniqueAllowedStrings_(value, allowed) {
  if (!Array.isArray(value)) return []
  const seen = new Set()
  return value.filter(function (item) {
    if (typeof item !== 'string' || !allowed.has(item) || seen.has(item)) {
      return false
    }
    seen.add(item)
    return true
  })
}

function cleanString_(value, maximumLength) {
  return typeof value === 'string' ? value.trim().slice(0, maximumLength) : ''
}

function snapshotFor_(participantId) {
  const ballots = readAllBallots_()
  const partnerId = participantId === 'ryder' ? 'yashvi' : 'ryder'
  const bothReady = ballots.ryder.revealReady && ballots.yashvi.revealReady
  const validWinners = bothReady
    ? readWinners_().filter(function (winner) {
        const ownerBallot = ballots[winner.nominationOwner]
        return (
          ownerBallot &&
          ownerBallot.nominations.some(function (nomination) {
            return (
              nomination.id === winner.nominationId &&
              nomination.categoryId === winner.categoryId &&
              nomination.filmId === winner.filmId &&
              nomination.nominee === winner.nominee
            )
          })
        )
      })
    : []

  return {
    ok: true,
    participant: PARTICIPANTS[participantId],
    ballot: ballots[participantId],
    partnerReady: ballots[partnerId].revealReady,
    revealedBallots: bothReady
      ? [
          { participant: PARTICIPANTS.ryder, ballot: ballots.ryder },
          { participant: PARTICIPANTS.yashvi, ballot: ballots.yashvi },
        ]
      : null,
    winners: validWinners,
  }
}

function saveBallot_(participantId, ballot) {
  const sheet = sheet_(BALLOTS_SHEET)
  const row = participantId === 'ryder' ? 2 : 3
  sheet
    .getRange(row, 1, 1, 4)
    .setValues([
      [participantId, PARTICIPANTS[participantId].name, JSON.stringify(ballot), ballot.updatedAt],
    ])
}

function readAllBallots_() {
  const sheet = sheet_(BALLOTS_SHEET)
  const values = sheet.getRange(2, 1, 2, 4).getValues()
  const ballots = { ryder: emptyBallot_(), yashvi: emptyBallot_() }

  values.forEach(function (row) {
    const participantId = row[0]
    if (!PARTICIPANTS[participantId] || typeof row[2] !== 'string' || !row[2]) return
    try {
      ballots[participantId] = sanitizeStoredBallot_(JSON.parse(row[2]))
    } catch (error) {
      console.error('Ignoring invalid stored ballot for ' + participantId + ': ' + error)
    }
  })
  return ballots
}

function sanitizeStoredBallot_(value) {
  const ballot = sanitizeBallot_(value)
  ballot.updatedAt =
    value && typeof value.updatedAt === 'string'
      ? value.updatedAt
      : new Date(0).toISOString()
  return ballot
}

function bothBallotsReady_() {
  const ballots = readAllBallots_()
  return ballots.ryder.revealReady && ballots.yashvi.revealReady
}

function saveWinner_(winner) {
  const sheet = sheet_(WINNERS_SHEET)
  const lastRow = sheet.getLastRow()
  const values = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, 1).getValues() : []
  const existingIndex = values.findIndex(function (row) {
    return row[0] === winner.categoryId
  })
  const row = existingIndex >= 0 ? existingIndex + 2 : lastRow + 1
  sheet
    .getRange(row, 1, 1, 3)
    .setValues([[winner.categoryId, JSON.stringify(winner), winner.updatedAt]])
}

function readWinners_() {
  const sheet = sheet_(WINNERS_SHEET)
  const lastRow = sheet.getLastRow()
  if (lastRow <= 1) return []

  return sheet
    .getRange(2, 1, lastRow - 1, 3)
    .getValues()
    .map(function (row) {
      try {
        return JSON.parse(row[1])
      } catch (error) {
        return null
      }
    })
    .filter(function (winner) {
      return winner !== null
    })
}

function initializeSheets_() {
  const spreadsheet = spreadsheet_()
  const ballots = getOrCreateSheet_(spreadsheet, BALLOTS_SHEET)
  const winners = getOrCreateSheet_(spreadsheet, WINNERS_SHEET)

  ballots.getRange(1, 1, 1, 4).setValues([
    ['Participant ID', 'Name', 'Ballot JSON', 'Updated at'],
  ])
  ballots.setFrozenRows(1)
  ballots.getRange(2, 1, 2, 4).setValues([
    ['ryder', 'Ryder', JSON.stringify(emptyBallot_()), new Date(0).toISOString()],
    ['yashvi', 'Yashvi', JSON.stringify(emptyBallot_()), new Date(0).toISOString()],
  ])

  winners.getRange(1, 1, 1, 3).setValues([
    ['Category ID', 'Winner JSON', 'Updated at'],
  ])
  winners.setFrozenRows(1)
  ballots.autoResizeColumns(1, 4)
  winners.autoResizeColumns(1, 3)
}

function getOrCreateSheet_(spreadsheet, name) {
  return spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name)
}

function spreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID')
  if (!id) throw new Error('Festival Ballot is not configured.')
  return SpreadsheetApp.openById(id)
}

function sheet_(name) {
  const sheet = spreadsheet_().getSheetByName(name)
  if (!sheet) throw new Error('Missing ' + name + ' sheet. Run setupFestivalBallot.')
  return sheet
}

function respondSafely_(operation) {
  try {
    return jsonResponse_(operation())
  } catch (error) {
    console.error(error && error.stack ? error.stack : error)
    return jsonResponse_({
      ok: false,
      error: error && error.message ? error.message : 'Unexpected server error.',
    })
  }
}

function jsonResponse_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(
    ContentService.MimeType.JSON,
  )
}