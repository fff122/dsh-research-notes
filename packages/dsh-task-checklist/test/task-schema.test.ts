import { describe, expect, it } from 'vitest'

import {
  createTask,
  ensureTaskId,
  normalizeTags,
  type CreateTaskInput,
} from '../src/task-schema.js'

describe('task schema', () => {
  it('creates a normalized todo task with safe defaults', () => {
    const input: CreateTaskInput = {
      title: '  Review pull request  ',
      details: '  Read tests before merging.  ',
      tags: [' Work ', 'review', 'work'],
    }

    const task = createTask(input, new Date('2026-08-14T00:00:00.000Z'))

    expect(task).toMatchObject({
      title: 'Review pull request',
      details: 'Read tests before merging.',
      tags: ['review', 'work'],
      priority: 'normal',
      status: 'todo',
      createdAt: '2026-08-14T00:00:00.000Z',
    })
    expect(task.id).toMatch(/^task-[0-9a-f-]{36}$/)
  })

  it('rejects invalid task fields', () => {
    expect(() => createTask({ title: ' ' })).toThrow('Task title cannot be empty')
    expect(() => normalizeTags([''])).toThrow('Task tags cannot be empty')
    expect(() => ensureTaskId('not-a-task')).toThrow('Task id must be')
  })
})
