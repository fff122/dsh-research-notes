import { rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { ToolDefinition, ToolRunContext } from '@deepseek-ai/dsh-tools'
import { afterEach, describe, expect, it } from 'vitest'

import { createToolDefinitions } from '../src/index.js'
import { PresetStore } from '../src/preset-store.js'

const workspaces: string[] = []

afterEach(async () => {
  await Promise.all(
    workspaces.splice(0).map((workspace) => rm(workspace, { force: true, recursive: true })),
  )
})

describe('prompt preset Harness tools', () => {
  it('registers the expected tools', () => {
    const tools = createTools()
    expect(Object.keys(tools).sort()).toEqual([
      'preset_apply',
      'preset_delete',
      'preset_list',
      'preset_save',
    ])
  })

  it('saves and applies a preset with variable values', async () => {
    const tools = createTools()
    await executeTool(getTool(tools, 'preset_save'), {
      name: 'Meeting Summary',
      template: 'Summarize the {{topic}} meeting for {{audience}}.',
      tags: ['work'],
    })

    await expect(
      executeTool(getTool(tools, 'preset_apply'), {
        name: 'Meeting Summary',
        variables: { topic: 'launch', audience: 'engineers' },
      }),
    ).resolves.toEqual({
      name: 'Meeting Summary',
      rendered: 'Summarize the launch meeting for engineers.',
      variables: ['topic', 'audience'],
      missing: [],
    })
  })

  it('lists by tag and deletes a preset', async () => {
    const tools = createTools()
    await executeTool(getTool(tools, 'preset_save'), {
      name: 'One',
      template: 'One',
      tags: ['one', 'shared'],
    })
    await executeTool(getTool(tools, 'preset_save'), {
      name: 'Two',
      template: 'Two',
      tags: ['two'],
    })

    await expect(
      executeTool(getTool(tools, 'preset_list'), { tags: ['shared'] }),
    ).resolves.toMatchObject([{ name: 'One' }])
    await expect(executeTool(getTool(tools, 'preset_delete'), { name: 'Two' })).resolves.toEqual({
      name: 'Two',
      deleted: true,
    })
  })
})

function createTools(): Record<string, ToolDefinition> {
  const workspace = createWorkspace()
  return Object.fromEntries(
    createToolDefinitions(new PresetStore(workspace)).map((tool) => [tool.name, tool]),
  )
}

function createWorkspace(): string {
  const workspace = join(tmpdir(), `dsh-prompt-presets-tools-${process.pid}-${workspaces.length}`)
  workspaces.push(workspace)
  return workspace
}

function getTool(tools: Record<string, ToolDefinition>, name: string): ToolDefinition {
  const tool = tools[name]
  if (tool === undefined) throw new Error(`Tool not found: ${name}`)
  return tool
}

function executeTool(tool: ToolDefinition, args: unknown): Promise<unknown> {
  return tool.execute(args, {} as ToolRunContext)
}
