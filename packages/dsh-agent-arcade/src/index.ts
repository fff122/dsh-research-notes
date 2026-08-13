import type { Context } from '@deepseek-ai/cordis'
import { defineTool, type ToolDefinition, type ToolRunContext } from '@deepseek-ai/dsh-tools'
import type ToolRuntime from '@deepseek-ai/dsh-tools'

import { SnakeGame, type Direction } from './snake-game.js'

export const name = 'dsh-agent-arcade'
export const inject = ['tools']

type HarnessContext = Context & { tools: ToolRuntime }

type GameManager = {
  current: SnakeGame | null
}

export function apply(ctx: HarnessContext): void {
  const manager: GameManager = { current: null }
  for (const tool of createToolDefinitions(manager)) {
    ctx.tools.register(tool)
  }
}

export function createToolDefinitions(manager: GameManager = { current: null }): ToolDefinition[] {
  return [
    defineTool({
      name: 'arcade_snake_new',
      description: 'Start a deterministic Agent-played Snake game on a small board.',
      parameters: {
        width: {
          type: 'integer',
          description: 'Board width from 5 to 30. Defaults to 12.',
        },
        height: {
          type: 'integer',
          description: 'Board height from 5 to 30. Defaults to 8.',
        },
        seed: {
          type: 'integer',
          description: 'Unsigned 32-bit random seed for replayable food placement. Defaults to 1.',
        },
      },
      output: {
        schema: snakeSnapshotSchema(),
        render: (_args, value) => [{ type: 'text', text: formatToolOutput(value) }],
      },
      async execute(args, _exec: ToolRunContext) {
        manager.current = new SnakeGame({
          ...(args.width === undefined ? {} : { width: args.width }),
          ...(args.height === undefined ? {} : { height: args.height }),
          ...(args.seed === undefined ? {} : { seed: args.seed }),
        })
        return manager.current.snapshot()
      },
    }),

    defineTool({
      name: 'arcade_snake_step',
      description:
        'Let the Agent choose the safest direction toward the food and advance the current Snake game by one turn.',
      parameters: {
        direction: {
          type: 'string',
          enum: ['up', 'down', 'left', 'right'],
          description: 'Optional direction override for a manual or scripted turn.',
        },
      },
      output: {
        schema: snakeStepSchema(),
        render: (_args, value) => [{ type: 'text', text: formatToolOutput(value) }],
      },
      async execute(args, _exec: ToolRunContext) {
        return requireGame(manager).step(args.direction as Direction | undefined)
      },
    }),

    defineTool({
      name: 'arcade_snake_render',
      description: 'Render the current Snake board as readable ASCII art for the user to watch.',
      parameters: {},
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            board: { type: 'string', required: true },
            score: { type: 'integer', required: true },
            status: { type: 'string', required: true },
          },
        } as const,
        render: (_args, value) => [{ type: 'text', text: formatToolOutput(value) }],
      },
      async execute(_args, _exec: ToolRunContext) {
        const game = requireGame(manager)
        const snapshot = game.snapshot()
        return { board: game.render(), score: snapshot.score, status: snapshot.status }
      },
    }),

    defineTool({
      name: 'arcade_snake_history',
      description: 'Return every Agent decision and outcome from the current Snake game.',
      parameters: {},
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            steps: { type: 'array', required: true, items: snakeStepSchema() },
            count: { type: 'integer', required: true },
          },
        } as const,
        render: (_args, value) => [{ type: 'text', text: formatToolOutput(value) }],
      },
      async execute(_args, _exec: ToolRunContext) {
        const history = requireGame(manager).history()
        return { steps: history, count: history.length }
      },
    }),
  ]
}

function requireGame(manager: GameManager): SnakeGame {
  if (manager.current === null)
    throw new Error('No Snake game is running. Call arcade_snake_new first.')
  return manager.current
}

function snakeSnapshotSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      width: { type: 'integer', required: true },
      height: { type: 'integer', required: true },
      seed: { type: 'integer', required: true },
      snake: {
        type: 'array',
        required: true,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            x: { type: 'integer', required: true },
            y: { type: 'integer', required: true },
          },
        },
      },
      food: {
        oneOf: [
          {
            type: 'object',
            additionalProperties: false,
            properties: {
              x: { type: 'integer', required: true },
              y: { type: 'integer', required: true },
            },
          },
          { type: 'null' },
        ],
        required: true,
      },
      direction: { type: 'string', required: true },
      score: { type: 'integer', required: true },
      status: { type: 'string', required: true },
      step: { type: 'integer', required: true },
    },
  } as const
}

function snakeStepSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      step: { type: 'integer', required: true },
      direction: { type: 'string', required: true },
      reason: { type: 'string', required: true },
      head: {
        type: 'object',
        additionalProperties: false,
        properties: {
          x: { type: 'integer', required: true },
          y: { type: 'integer', required: true },
        },
      },
      food: {
        oneOf: [
          {
            type: 'object',
            additionalProperties: false,
            properties: {
              x: { type: 'integer', required: true },
              y: { type: 'integer', required: true },
            },
          },
          { type: 'null' },
        ],
      },
      score: { type: 'integer', required: true },
      status: { type: 'string', required: true },
    },
  } as const
}

function formatToolOutput(value: unknown): string {
  return JSON.stringify(value, null, 2)
}
