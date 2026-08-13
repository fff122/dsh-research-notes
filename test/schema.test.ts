import { describe, expect, it } from 'vitest'

import {
  normaliseTags,
  toNoteSource,
  validateContent,
  validateNoteId,
  validateSearchQuery,
  validateTitle,
} from '../src/schema.js'

describe('schema helpers', () => {
  it('normalises, deduplicates, and sorts tags', () => {
    expect(normaliseTags([' DSH ', 'search', 'dsh', '', 'Search'])).toEqual(['dsh', 'search'])
  })

  it('rejects empty titles and content', () => {
    expect(() => validateTitle('   ')).toThrow('title must not be empty')
    expect(() => validateContent('\n\t')).toThrow('content must not be empty')
  })

  it('accepts only http and https source URLs', () => {
    expect(toNoteSource('https://example.com/docs', 'Docs')).toEqual({
      url: 'https://example.com/docs',
      title: 'Docs',
    })
    expect(() => toNoteSource('file:///tmp/note.md', undefined)).toThrow(
      'sourceUrl must be a valid http or https URL',
    )
    expect(() => toNoteSource(undefined, 'Orphan title')).toThrow('sourceTitle requires sourceUrl')
  })

  it('validates search queries and note IDs', () => {
    expect(validateSearchQuery('  Harness  ')).toBe('harness')
    expect(() => validateSearchQuery('')).toThrow('query must not be empty')
    expect(validateNoteId('20260814-abc123')).toBe('20260814-abc123')
    expect(() => validateNoteId('../outside')).toThrow('id has an invalid format')
  })
})
