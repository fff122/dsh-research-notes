import { describe, expect, it } from 'vitest'

import {
  extractVariables,
  normalizeTags,
  renderTemplate,
  normalizePresetName,
} from '../src/preset-schema.js'

describe('preset schema helpers', () => {
  it('extracts unique variables in their first-seen order', () => {
    expect(extractVariables('Hello {{name}}, use {{ tone }} for {{name}}.')).toEqual([
      'name',
      'tone',
    ])
  })

  it('renders scalar and JSON values while reporting missing variables', () => {
    const result = renderTemplate('Hi {{name}}. Items: {{items}}. Tone: {{tone}}.', {
      name: 'Ada',
      items: ['one', 'two'],
    })

    expect(result).toEqual({
      rendered: 'Hi Ada. Items: ["one","two"]. Tone: {{tone}}.',
      variables: ['name', 'items', 'tone'],
      missing: ['tone'],
    })
  })

  it('normalizes tags and rejects unsafe names', () => {
    expect(normalizeTags([' Work ', 'work', 'Docs'])).toEqual(['work', 'docs'])
    expect(() => normalizePresetName('../secret')).toThrow('slash')
  })
})
