import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'

interface TextOutput {
  content: string
  setMimeType: () => TextOutput
}

interface AppsScriptApi {
  setupFestivalBallot: () => { ryder: string; yashvi: string }
  doGet: (event: { parameter: { token: string } }) => TextOutput
  doPost: (event: { postData: { contents: string } }) => TextOutput
}

interface SheetRange {
  getValues: () => unknown[][]
  setValues: (values: unknown[][]) => SheetRange
}

class MemorySheet {
  private readonly rows: unknown[][] = []

  getRange(row: number, column: number, rowCount = 1, columnCount = 1): SheetRange {
    return {
      getValues: () =>
        Array.from({ length: rowCount }, (_, rowOffset) =>
          Array.from(
            { length: columnCount },
            (_, columnOffset) =>
              this.rows[row - 1 + rowOffset]?.[column - 1 + columnOffset] ?? '',
          ),
        ),
      setValues: (values) => {
        values.forEach((valuesRow, rowOffset) => {
          const targetRow = row - 1 + rowOffset
          this.rows[targetRow] ??= []
          valuesRow.forEach((value, columnOffset) => {
            this.rows[targetRow][column - 1 + columnOffset] = value
          })
        })
        return this.getRange(row, column, rowCount, columnCount)
      },
    }
  }

  getLastRow(): number {
    for (let index = this.rows.length - 1; index >= 0; index -= 1) {
      if (this.rows[index]?.some((value) => value !== '')) return index + 1
    }
    return 0
  }

  setFrozenRows(): void {}
  autoResizeColumns(): void {}
}

class MemorySpreadsheet {
  private readonly sheets = new Map<string, MemorySheet>()

  getId(): string {
    return 'festival-ballot-sheet'
  }

  getSheetByName(name: string): MemorySheet | null {
    return this.sheets.get(name) ?? null
  }

  insertSheet(name: string): MemorySheet {
    const sheet = new MemorySheet()
    this.sheets.set(name, sheet)
    return sheet
  }
}

function loadAppsScript(): AppsScriptApi {
  const source = readFileSync(
    new URL('../../google-apps-script/Code.gs', import.meta.url),
    'utf8',
  )
  const spreadsheet = new MemorySpreadsheet()
  const properties = new Map<string, string>()
  let uuidSequence = 0
  const scriptProperties = {
    getProperty: (key: string) => properties.get(key) ?? null,
    setProperty: (key: string, value: string) => {
      properties.set(key, value)
    },
    setProperties: (values: Record<string, string>) => {
      Object.entries(values).forEach(([key, value]) => properties.set(key, value))
    },
  }

  return runInNewContext(
    `${source}\n;({ setupFestivalBallot, doGet, doPost })`,
    {
      Set,
      Map,
      Date,
      JSON,
      console: { log: () => undefined, error: () => undefined },
      PropertiesService: { getScriptProperties: () => scriptProperties },
      SpreadsheetApp: {
        getActiveSpreadsheet: () => spreadsheet,
        openById: () => spreadsheet,
      },
      LockService: {
        getScriptLock: () => ({ waitLock: () => undefined, releaseLock: () => undefined }),
      },
      Utilities: {
        Charset: { UTF_8: 'UTF_8' },
        DigestAlgorithm: { SHA_256: 'SHA_256' },
        getUuid: () => {
          uuidSequence += 1
          return `00000000-0000-4000-8000-${String(uuidSequence).padStart(12, '0')}`
        },
        computeDigest: (_algorithm: string, value: string) =>
          [...createHash('sha256').update(value).digest()],
        base64EncodeWebSafe: (bytes: number[]) =>
          Buffer.from(bytes).toString('base64url'),
      },
      ContentService: {
        MimeType: { JSON: 'application/json' },
        createTextOutput: (content: string): TextOutput => {
          const output: TextOutput = {
            content,
            setMimeType: () => output,
          }
          return output
        },
      },
    },
  ) as AppsScriptApi
}

function response(output: TextOutput) {
  return JSON.parse(output.content) as Record<string, unknown>
}

function post(
  api: AppsScriptApi,
  payload: Record<string, unknown>,
): Record<string, unknown> {
  return response(
    api.doPost({ postData: { contents: JSON.stringify(payload) } }),
  )
}

describe('Google Apps Script privacy boundary', () => {
  it('keeps ballots independent until both people explicitly seal them', () => {
    const api = loadAppsScript()
    const keys = api.setupFestivalBallot()
    const ryderBallot = {
      version: 1,
      watchedFilmIds: ['hope'],
      ranking: ['hope'],
      nominations: [
        {
          id: 'nomination-1',
          categoryId: 'director',
          filmId: 'hope',
          nominee: 'Na Hong-jin',
          note: 'Controlled chaos.',
          createdAt: '2026-09-09T22:00:00.000Z',
        },
      ],
      revealReady: true,
      updatedAt: '2026-09-09T22:00:00.000Z',
    }

    const ryderSave = post(api, {
      action: 'saveBallot',
      token: keys.ryder,
      ballot: ryderBallot,
    })
    expect(ryderSave.ok).toBe(true)
    expect(ryderSave.revealedBallots).toBeNull()

    const yashviBefore = response(api.doGet({ parameter: { token: keys.yashvi } }))
    expect(yashviBefore.partnerReady).toBe(true)
    expect(yashviBefore.revealedBallots).toBeNull()
    expect(JSON.stringify(yashviBefore)).not.toContain('Na Hong-jin')

    const winnerBeforeReveal = post(api, {
      action: 'saveWinner',
      token: keys.ryder,
      winner: {
        categoryId: 'director',
        filmId: 'hope',
        nominee: 'Na Hong-jin',
        nominationOwner: 'ryder',
        nominationId: 'nomination-1',
      },
    })
    expect(winnerBeforeReveal).toMatchObject({
      ok: false,
      error: 'Both ballots must be sealed before choosing winners.',
    })

    const yashviSave = post(api, {
      action: 'saveBallot',
      token: keys.yashvi,
      ballot: {
        version: 1,
        watchedFilmIds: [],
        ranking: [],
        nominations: [],
        revealReady: true,
      },
    })
    expect(yashviSave.ok).toBe(true)
    expect(yashviSave.revealedBallots).toHaveLength(2)
    expect(JSON.stringify(yashviSave)).toContain('Na Hong-jin')

    const winnerAfterReveal = post(api, {
      action: 'saveWinner',
      token: keys.yashvi,
      winner: {
        categoryId: 'director',
        filmId: 'hope',
        nominee: 'Na Hong-jin',
        nominationOwner: 'ryder',
        nominationId: 'nomination-1',
      },
    })
    expect(winnerAfterReveal.ok).toBe(true)
    expect(winnerAfterReveal.winners).toHaveLength(1)
  })

  it('rejects an invalid invite key without exposing ballot data', () => {
    const api = loadAppsScript()
    api.setupFestivalBallot()
    const result = response(
      api.doGet({ parameter: { token: 'not-a-valid-invite-key' } }),
    )

    expect(result).toEqual({ ok: false, error: 'Invalid or expired invite key.' })
    expect(result).not.toHaveProperty('ballot')
  })
})