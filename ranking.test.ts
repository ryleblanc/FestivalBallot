import { describe, expect, it } from 'vitest'
import {
  answerPlacement,
  beginPlacement,
  moveInRanking,
  type PlacementOutcome,
} from './ranking'

function answerAll(
  outcome: PlacementOutcome,
  newFilmRanksHigher: boolean,
): PlacementOutcome {
  let current = outcome
  while (!current.done) {
    current = answerPlacement(current.session, newFilmRanksHigher)
  }
  return current
}

describe('head-to-head placement', () => {
  it('places the first watched film without a comparison', () => {
    expect(beginPlacement('hope', [])).toEqual({
      done: true,
      ranking: ['hope'],
      insertionIndex: 0,
    })
  })

  it('places a film first when it wins every comparison', () => {
    const outcome = answerAll(beginPlacement('new', ['a', 'b', 'c']), true)
    expect(outcome).toMatchObject({
      done: true,
      ranking: ['new', 'a', 'b', 'c'],
      insertionIndex: 0,
    })
  })

  it('places a film last when it loses every comparison', () => {
    const outcome = answerAll(beginPlacement('new', ['a', 'b', 'c']), false)
    expect(outcome).toMatchObject({
      done: true,
      ranking: ['a', 'b', 'c', 'new'],
      insertionIndex: 3,
    })
  })

  it('finds a middle position and removes an existing copy', () => {
    let outcome = beginPlacement('new', ['a', 'new', 'b', 'c'])
    expect(outcome.done).toBe(false)
    if (outcome.done) return

    outcome = answerPlacement(outcome.session, true)
    expect(outcome.done).toBe(false)
    if (outcome.done) return

    outcome = answerPlacement(outcome.session, false)
    expect(outcome).toMatchObject({
      done: true,
      ranking: ['a', 'new', 'b', 'c'],
      insertionIndex: 1,
    })
  })
})

describe('manual ranking moves', () => {
  it('moves an item by one place', () => {
    expect(moveInRanking(['a', 'b', 'c'], 'b', -1)).toEqual(['b', 'a', 'c'])
    expect(moveInRanking(['a', 'b', 'c'], 'b', 1)).toEqual(['a', 'c', 'b'])
  })

  it('leaves boundary and unknown moves unchanged', () => {
    const ranking = ['a', 'b']
    expect(moveInRanking(ranking, 'a', -1)).toBe(ranking)
    expect(moveInRanking(ranking, 'missing', 1)).toBe(ranking)
  })
})