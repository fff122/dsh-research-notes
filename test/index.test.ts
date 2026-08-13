import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { createToolDefinitions } from '../src/index.js'
import { NoteStore } from '../src/note-store.js'
import type { JsonValue, ToolDefinition } from '@deepseek-ai/dsh-tools'

type ExecuteContext = Parameters<ToolDefinition['execute']>[1]

const workspaces: string[] = []

afterEach(async () => {
  await Promise.all(
    workspaces.splice(0).map((workspace) => rm(workspace, { recursive: true, force: true })),
  )
})

async function createTools(): Promise<ToolDefinition[]> {
  const workspace = await mkdtemp(join(tmpdir(), 'dsh-research-notes-tools-'))
  workspaces.push(workspace)
  return createToolDefinitions(new NoteStore(workspace))
}

function executeContext(): ExecuteContext {
  return { signal: new AbortController().signal } as ExecuteContext
}

describe('Harness tool definitions', () => {
  it('registers the four planned tools', async () => {
    const tools = await createTools()

    expect(tools.map((tool) => tool.name)).toEqual([
      'research_note_save',
      'research_note_list',
      'research_note_search',
      'research_note_export',
    ])
  })

  it('validates arguments and renders a saved-note result', async () => {
    const [save] = await createTools()
    if (!save) throw new Error('save tool is missing')

    const result = await save.execute(
      {
        title: '可读的插件代码',
        content: '工具入口保持简单。',
        tags: ['code-quality'],
      },
      executeContext(),
    )

    expect(result).toMatchObject({ title: '可读的插件代码' })
    expect(save.output.render({}, result as JsonValue)).toEqual([
      { type: 'text', text: expect.stringContaining('可读的插件代码') },
    ])
    await expect(save.execute({ title: '', content: '内容' }, executeContext())).rejects.toThrow(
      'title must not be empty',
    )
  })
})
