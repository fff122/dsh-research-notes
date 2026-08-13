import { describe, expect, it } from 'vitest'

import {
  formatJson,
  parseJsonPath,
  queryJson,
  sortJsonKeys,
  validateJson,
} from '../src/json-utils.js'

describe('formatJson', () => {
  it('formats compact JSON with the default indentation', () => {
    expect(formatJson('{"name":"Ada","active":true}')).toBe(
      '{\n  "name": "Ada",\n  "active": true\n}',
    )
  })

  it('sorts keys recursively when requested', () => {
    expect(formatJson('{"z":1,"a":{"y":2,"b":3}}', { sortKeys: true })).toBe(
      '{\n  "a": {\n    "b": 3,\n    "y": 2\n  },\n  "z": 1\n}',
    )
  })

  it('rejects an invalid indentation value', () => {
    expect(() => formatJson('{}', { indent: 11 })).toThrow('between 0 and 10')
  })
})

describe('validateJson', () => {
  it('returns valid for JSON values', () => {
    expect(validateJson('{"ok":true}')).toEqual({ valid: true })
  })

  it('returns a readable error for invalid JSON', () => {
    const result = validateJson('{"ok":}')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Invalid JSON')
  })
})

describe('parseJsonPath and queryJson', () => {
  const value = {
    user: { name: 'Ada' },
    items: [{ id: 7, title: 'First' }],
  }

  it('supports dot, dollar-root, and array paths', () => {
    expect(parseJsonPath('$.items[0].title')).toEqual(['items', 0, 'title'])
    expect(queryJson(value, 'user.name')).toBe('Ada')
    expect(queryJson(value, '$.items[0].id')).toBe(7)
  })

  it('supports quoted keys in bracket notation', () => {
    expect(parseJsonPath('["user"]["name"]')).toEqual(['user', 'name'])
  })

  it('reports missing values and malformed paths', () => {
    expect(() => queryJson(value, 'user.email')).toThrow('does not exist')
    expect(() => parseJsonPath('items[0')).toThrow('missing closing bracket')
  })

  it('does not treat inherited object properties as JSON data', () => {
    expect(() => queryJson(value, 'user.toString')).toThrow('does not exist')
  })
})

describe('sortJsonKeys', () => {
  it('preserves arrays while sorting objects inside them', () => {
    expect(sortJsonKeys({ rows: [{ z: 1, a: 2 }] })).toEqual({ rows: [{ a: 2, z: 1 }] })
  })
})
