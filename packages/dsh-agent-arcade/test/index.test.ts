import type { ToolDefinition, ToolRunContext } from '@deepseek-ai/dsh-tools'
import { describe, expect, it } from 'vitest'

import { createToolDefinitions } from '../src/index.js'

describe('agent arcade Harness tools', () => {
  it('registers the expected tools', () => {
    const tools = createTools()
    expect(Object.keys(tools).sort()).toEqual([
      'arcade_snake_history',
      'arcade_snake_new',
      'arcade_snake_render',
      'arcade_snake_step',
    ])
  })

  it('starts a seeded game and advances it with an Agent decision', async () => {
    const tools = createTools()
    const started = await executeTool(getTool(tools, 'arcade_snake_new'), {
      width: 10,
      height: 6,
      seed: 123,
    })
    expect(started).toMatchObject({ width: 10, height: 6, seed: 123, status: 'running', step: 0 })

    const step = await executeTool(getTool(tools, 'arcade_snake_step'), {})
    expect(step).toMatchObject({ step: 1, status: 'running' })
    expect((step as { reason: string }).reason).toContain('Move')

    const rendered = await executeTool(getTool(tools, 'arcade_snake_render'), {})
    expect((rendered as { board: string }).board).toContain('Score:')

    const history = await executeTool(getTool(tools, 'arcade_snake_history'), {})
    expect(history).toMatchObject({ count: 1, steps: [{ step: 1 }] })
  })

  it('requires a game before using step or render tools', async () => {
    const tools = createTools()
    await expect(executeTool(getTool(tools, 'arcade_snake_step'), {})).rejects.toThrow(
      'No Snake game is running',
    )
    await expect(executeTool(getTool(tools, 'arcade_snake_render'), {})).rejects.toThrow(
      'No Snake game is running',
    )
  })
})

function createTools(): Record<string, ToolDefinition> {
  return Object.fromEntries(createToolDefinitions().map((tool) => [tool.name, tool]))
}

function getTool(tools: Record<string, ToolDefinition>, name: string): ToolDefinition {
  const tool = tools[name]
  if (tool === undefined) throw new Error(`Tool not found: ${name}`)
  return tool
}

function executeTool(tool: ToolDefinition, args: unknown): Promise<unknown> {
  return tool.execute(args, {} as ToolRunContext)
}
