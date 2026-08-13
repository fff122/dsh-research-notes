import { describe, expect, it } from 'vitest'

import { SnakeGame } from '../src/snake-game.js'

describe('SnakeGame', () => {
  it('replays the same decisions with the same seed', () => {
    const first = new SnakeGame({ width: 12, height: 8, seed: 42 })
    const second = new SnakeGame({ width: 12, height: 8, seed: 42 })

    for (const direction of ['up', 'left', 'down', 'right'] as const) {
      expect(first.step(direction)).toEqual(second.step(direction))
    }
    expect(first.snapshot()).toEqual(second.snapshot())
    expect(first.history()).toHaveLength(4)
  })

  it('renders a board that a user can watch', () => {
    const game = new SnakeGame({ width: 8, height: 5, seed: 7 })
    const rendered = game.render()

    expect(rendered).toContain('Score: 0 | Step: 0 | Status: running')
    expect(rendered).toContain('H')
    expect(rendered).toContain('o')
    expect(rendered).toContain('*')
    expect(rendered.split('\n')).toHaveLength(8)
  })

  it('records a loss when the snake hits a wall', () => {
    const game = new SnakeGame({ width: 5, height: 5, seed: 1 })
    game.step('right')
    game.step('right')
    const collision = game.step('right')

    expect(collision.status).toBe('lost')
    expect(collision.reason).toContain('collision detected')
    expect(game.history()).toHaveLength(3)
    expect(() => game.step()).toThrow('already lost')
  })

  it('rejects an immediate reverse move', () => {
    const game = new SnakeGame({ seed: 1 })
    expect(() => game.step('left')).toThrow('cannot reverse')
  })
})
