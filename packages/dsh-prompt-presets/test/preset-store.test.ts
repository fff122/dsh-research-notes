import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { PresetStore } from '../src/preset-store.js'

const workspaces: string[] = []

afterEach(async () => {
  await Promise.all(workspaces.splice(0).map((workspace) => rm(workspace, { recursive: true })))
})

describe('PresetStore', () => {
  it('saves, updates, lists, gets, and deletes presets locally', async () => {
    const workspace = await createWorkspace()
    const store = new PresetStore(workspace)

    const first = await store.save({
      name: 'Code Review',
      template: 'Review {{language}} code for {{focus}}.',
      tags: ['dev', 'review'],
      description: 'Review a code sample.',
    })
    expect(first).toMatchObject({ name: 'Code Review', tags: ['dev', 'review'] })

    const updated = await store.save({
      name: 'code review',
      template: 'Review {{language}} code carefully.',
      tags: ['dev'],
    })
    expect(updated).toMatchObject({
      name: 'code review',
      template: 'Review {{language}} code carefully.',
    })
    expect(updated.createdAt).toBe(first.createdAt)
    expect(updated.updatedAt).not.toBe(first.updatedAt)

    await store.save({ name: 'Daily Plan', template: 'Plan {{day}}.', tags: ['planning'] })
    await expect(store.list({ tags: ['DEV'] })).resolves.toMatchObject([
      { name: 'code review', tags: ['dev'] },
    ])
    await expect(store.get('CODE REVIEW')).resolves.toMatchObject({
      template: 'Review {{language}} code carefully.',
    })

    await expect(store.delete('daily plan')).resolves.toEqual({ name: 'Daily Plan', deleted: true })
    await expect(store.delete('missing')).resolves.toEqual({ name: 'missing', deleted: false })

    const data = await readFile(join(workspace, '.dsh/prompt-presets/presets.json'), 'utf8')
    expect(JSON.parse(data)).toHaveLength(1)
  })

  it('returns an error when applying an unknown preset', async () => {
    const store = new PresetStore(await createWorkspace())
    await expect(store.get('unknown')).rejects.toThrow('Preset not found')
  })
})

async function createWorkspace(): Promise<string> {
  const workspace = await mkdtemp(join(tmpdir(), 'dsh-prompt-presets-'))
  workspaces.push(workspace)
  return workspace
}
