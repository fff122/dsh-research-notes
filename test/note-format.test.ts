import { describe, expect, it } from 'vitest'

import { parseNoteFile, serializeNote } from '../src/note-format.js'
import type { ResearchNote } from '../src/schema.js'

const note: ResearchNote = {
  id: '20260814-abc123',
  title: 'Harness 工具接口',
  content: '工具服务需要在 inject 中声明。',
  source: {
    url: 'https://example.com/docs',
    title: '官方文档',
  },
  tags: ['dsh', 'plugin'],
  createdAt: '2026-08-14T12:00:00.000Z',
  updatedAt: '2026-08-14T12:00:00.000Z',
}

describe('note Markdown format', () => {
  it('round-trips a human-readable Markdown note', () => {
    const fileContent = serializeNote(note)

    expect(fileContent).toContain('"title": "Harness 工具接口"')
    expect(fileContent).toContain('工具服务需要在 inject 中声明。')
    expect(parseNoteFile(fileContent)).toEqual(note)
  })

  it('rejects malformed front matter', () => {
    expect(() => parseNoteFile('not a note')).toThrow('missing a valid front matter block')
    expect(() => parseNoteFile('---\nnot json\n---\n\nBody')).toThrow('not valid JSON')
  })

  it('rejects notes with empty bodies', () => {
    const emptyBody = serializeNote({ ...note, content: 'content' }).replace('content', '   ')
    expect(() => parseNoteFile(emptyBody)).toThrow('content must not be empty')
  })
})
