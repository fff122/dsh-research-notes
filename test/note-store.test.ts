import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { NoteStore } from '../src/note-store.js'

const workspaces: string[] = []

afterEach(async () => {
  await Promise.all(
    workspaces.splice(0).map((workspace) => rm(workspace, { recursive: true, force: true })),
  )
})

async function createStore(): Promise<NoteStore> {
  const workspace = await mkdtemp(join(tmpdir(), 'dsh-research-notes-'))
  workspaces.push(workspace)

  const ids = ['20260814-first', '20260814-second']
  return new NoteStore(workspace, undefined, {
    now: () => new Date('2026-08-14T12:00:00.000Z'),
    idFactory: () => ids.shift() ?? '20260814-extra',
  })
}

describe('NoteStore', () => {
  it('saves notes and returns a searchable summary', async () => {
    const store = await createStore()

    const saved = await store.save({
      title: 'Harness 插件开发',
      content: '使用 defineTool 注册工具。',
      sourceUrl: 'https://example.com/harness',
      sourceTitle: 'Harness 文档',
      tags: ['DSH', 'Plugin'],
    })

    expect(saved.id).toBe('20260814-first')
    expect(saved.tags).toEqual(['dsh', 'plugin'])
    expect(await store.list({})).toMatchObject([
      {
        id: '20260814-first',
        title: 'Harness 插件开发',
        tags: ['dsh', 'plugin'],
      },
    ])
    expect(await store.list({ tag: 'PLUGIN' })).toHaveLength(1)
    expect(await store.search({ query: 'defineTool' })).toMatchObject([
      {
        note: { id: '20260814-first' },
        excerpt: '使用 defineTool 注册工具。',
      },
    ])
  })

  it('exports selected notes to a Markdown research pack', async () => {
    const store = await createStore()
    await store.save({ title: '第一条', content: '保留这条。' })
    await store.save({ title: '第二条', content: '不导出这条。' })

    const result = await store.export({ ids: ['20260814-first'] })
    const exported = await readFile(result.filePath, 'utf8')

    expect(result.count).toBe(1)
    expect(exported).toContain('# Research Notes')
    expect(exported).toContain('第一条')
    expect(exported).not.toContain('第二条')
  })

  it('returns an empty list for an unknown tag or query', async () => {
    const store = await createStore()
    await store.save({ title: '已有笔记', content: '内容' })

    expect(await store.list({ tag: 'missing' })).toEqual([])
    expect(await store.search({ query: 'missing' })).toEqual([])
  })
})
