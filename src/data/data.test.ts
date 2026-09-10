import { describe, expect, it } from 'vitest'
import { OSCAR_CATEGORIES } from './categories'
import { RANKABLE_SCREENINGS, SCREENINGS } from './schedule'

describe('festival source data', () => {
  it('contains the complete itinerary and Academy Award ballot', () => {
    expect(SCREENINGS).toHaveLength(32)
    expect(RANKABLE_SCREENINGS).toHaveLength(31)
    expect(OSCAR_CATEGORIES).toHaveLength(24)
    expect(new Set(SCREENINGS.map(({ id }) => id)).size).toBe(32)
    expect(new Set(OSCAR_CATEGORIES.map(({ id }) => id)).size).toBe(24)
  })

  it('keeps screenings chronological with valid source links and durations', () => {
    SCREENINGS.forEach((screening, index) => {
      expect(Date.parse(screening.end)).toBeGreaterThan(Date.parse(screening.start))
      expect(screening.imageUrl).toMatch(/^https:\/\/images\.ctfassets\.net\//)
      expect(screening.pageUrl).toMatch(/^https:\/\/2026\.tiffr\.com\/films\//)
      if (index > 0) {
        expect(Date.parse(screening.start)).toBeGreaterThanOrEqual(
          Date.parse(SCREENINGS[index - 1].start),
        )
      }
    })
  })
})