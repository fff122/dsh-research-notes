import { describe, expect, it } from 'vitest'
import type { ToolDefinition, ToolRunContext } from '@deepseek-ai/dsh-tools'

import { createToolDefinitions } from '../src/index.js'

describe('JSON Harness tools', () => {
  const definitions = createToolDefinitions()
  const tools = Object.fromEntries(definitions.map((tool) => [tool.name, tool]))

  it('registers the expected tools', () => {
    expect(Object.keys(tools).sort()).toEqual(['json_format', 'json_query', 'json_validate'])
  })

  it('formats JSON through the tool definition', async () => {
    const result = await executeTool(getTool(tools, 'json_format'), {
      json: '{"b":2,"a":1}',
      indent: 0,
      sortKeys: true,
    })

    expect(result).toEqual({ formatted: '{"a":1,"b":2}', characters: 13 })
  })

  it('validates JSON through the tool definition', async () => {
    await expect(
      executeTool(getTool(tools, 'json_validate'), { json: '{"ready":true}' }),
    ).resolves.toEqual({
      valid: true,
    })
  })

  it('queries nested data through the tool definition', async () => {
    const result = await executeTool(getTool(tools, 'json_query'), {
      json: '{"users":[{"name":"Ada"}]}',
      path: '$.users[0].name',
    })

    expect(result).toEqual({ path: '$.users[0].name', type: 'string', value: '"Ada"' })
  })
})

function getTool(tools: Record<string, ToolDefinition>, name: string): ToolDefinition {
  const tool = tools[name]
  if (!tool) throw new Error(`Tool not found: ${name}`)
  return tool
}

function executeTool(tool: ToolDefinition, args: unknown): Promise<unknown> {
  return tool.execute(args, {} as ToolRunContext)
}
