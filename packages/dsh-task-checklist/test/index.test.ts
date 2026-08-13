import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { ToolDefinition, ToolRunContext } from '@deepseek-ai/dsh-tools'
import { afterEach, describe, expect, it } from 'vitest'

import { createToolDefinitions } from '../src/index.js'
import { TaskStore } from '../src/task-store.js'

const workspaces: string[] = []

afterEach(async () => {
  await Promise.all(workspaces.splice(0).map((workspace) => rm(workspace, { recursive: true })))
})

describe('task checklist Harness tools', () => {
  it('registers the expected tools', async () => {
    const tools = await createTools()
    expect(Object.keys(tools).sort()).toEqual([
      'task_complete',
      'task_create',
      'task_export_markdown',
      'task_list',
    ])
  })

  it('creates and completes a task through tool definitions', async () => {
    const tools = await createTools()
    const created = await executeTool(getTool(tools, 'task_create'), {
      title: 'Plan the demo',
      tags: ['demo'],
      priority: 'high',
    })

    expect(created).toMatchObject({ title: 'Plan the demo', status: 'todo', priority: 'high' })
    const task = created as { id: string }

    await expect(
      executeTool(getTool(tools, 'task_complete'), { id: task.id }),
    ).resolves.toMatchObject({
      id: task.id,
      status: 'done',
    })
  })

  it('filters and exports tasks through tool definitions', async () => {
    const tools = await createTools()
    await executeTool(getTool(tools, 'task_create'), {
      title: 'Write the guide',
      tags: ['docs', 'release'],
    })

    await expect(
      executeTool(getTool(tools, 'task_list'), { tags: ['docs'] }),
    ).resolves.toMatchObject([{ title: 'Write the guide' }])

    const exported = await executeTool(getTool(tools, 'task_export_markdown'), {
      tags: ['release'],
    })
    expect(exported).toMatchObject({ count: 1 })
    expect((exported as { markdown: string }).markdown).toContain('# Task Checklist')
  })
})

async function createTools(): Promise<Record<string, ToolDefinition>> {
  const workspace = await mkdtemp(join(tmpdir(), 'dsh-task-checklist-tools-'))
  workspaces.push(workspace)
  const definitions = createToolDefinitions(new TaskStore(workspace))
  return Object.fromEntries(definitions.map((tool) => [tool.name, tool]))
}

function getTool(tools: Record<string, ToolDefinition>, name: string): ToolDefinition {
  const tool = tools[name]
  if (tool === undefined) throw new Error(`Tool not found: ${name}`)
  return tool
}

function executeTool(tool: ToolDefinition, args: unknown): Promise<unknown> {
  return tool.execute(args, {} as ToolRunContext)
}
