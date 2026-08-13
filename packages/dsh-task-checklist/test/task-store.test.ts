import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { TaskStore } from '../src/task-store.js'

const workspaces: string[] = []

afterEach(async () => {
  await Promise.all(workspaces.splice(0).map((workspace) => rm(workspace, { recursive: true })))
})

describe('TaskStore', () => {
  it('saves, filters, completes, and exports local tasks', async () => {
    const workspace = await createWorkspace()
    const store = new TaskStore(workspace)

    const highPriority = await store.create({
      title: 'Ship release notes',
      details: 'Mention the installation update.',
      tags: ['release', 'work'],
      priority: 'high',
    })
    await store.create({
      title: 'Buy tea',
      tags: ['personal'],
      priority: 'low',
    })

    await expect(store.list({ tags: ['work'] })).resolves.toMatchObject([
      { id: highPriority.id, title: 'Ship release notes', status: 'todo' },
    ])

    const completed = await store.complete(highPriority.id)
    expect(completed).toMatchObject({ id: highPriority.id, status: 'done' })
    expect(completed.completedAt).toBeDefined()

    const exported = await store.exportMarkdown({ status: 'done' })
    expect(exported.count).toBe(1)
    expect(exported.markdown).toContain('# Task Checklist')
    expect(exported.markdown).toContain('- [x] **Ship release notes** (high) · #release #work')
    expect(exported.markdown).toContain(`ID: \`${highPriority.id}\``)

    const data = await readFile(join(workspace, '.dsh/task-checklist/tasks.json'), 'utf8')
    expect(JSON.parse(data)).toHaveLength(2)
  })

  it('returns a useful error for an unknown task', async () => {
    const store = new TaskStore(await createWorkspace())
    await expect(store.complete('task-12345678-1234-1234-1234-123456789012')).rejects.toThrow(
      'Task not found',
    )
  })
})

async function createWorkspace(): Promise<string> {
  const workspace = await mkdtemp(join(tmpdir(), 'dsh-task-checklist-'))
  workspaces.push(workspace)
  return workspace
}
