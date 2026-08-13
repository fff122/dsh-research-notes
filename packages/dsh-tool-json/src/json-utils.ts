export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }
export type JsonPathSegment = string | number

export interface FormatOptions {
  indent?: number
  sortKeys?: boolean
}

export interface JsonValidationResult {
  valid: boolean
  error?: string
}

export function parseJson(text: string): JsonValue {
  try {
    return JSON.parse(text) as JsonValue
  } catch (error) {
    throw new Error(`Invalid JSON: ${getErrorMessage(error)}`)
  }
}

export function formatJson(text: string, options: FormatOptions = {}): string {
  const value = parseJson(text)
  const indent = normalizeIndent(options.indent)
  const valueToFormat = options.sortKeys ? sortJsonKeys(value) : value
  return JSON.stringify(valueToFormat, null, indent)
}

export function validateJson(text: string): JsonValidationResult {
  try {
    parseJson(text)
    return { valid: true }
  } catch (error) {
    return { valid: false, error: getErrorMessage(error) }
  }
}

export function parseJsonPath(path: string): JsonPathSegment[] {
  const input = path.trim()
  if (input === '' || input === '$') return []

  let cursor = input.startsWith('$') ? 1 : 0
  if (input[cursor] === '.') cursor += 1

  const segments: JsonPathSegment[] = []
  while (cursor < input.length) {
    if (input[cursor] === '.') {
      cursor += 1
      if (input[cursor] === '.' || input[cursor] === '[' || cursor >= input.length) {
        throw new Error(`Invalid JSON path near position ${cursor}`)
      }
    }

    if (input[cursor] === '[') {
      const close = input.indexOf(']', cursor + 1)
      if (close === -1) throw new Error('Invalid JSON path: missing closing bracket')

      const token = input.slice(cursor + 1, close).trim()
      if (/^\d+$/.test(token)) {
        segments.push(Number(token))
      } else if (token.startsWith('"') && token.endsWith('"')) {
        segments.push(parseQuotedPathKey(token))
      } else {
        throw new Error(`Invalid JSON path segment: [${token}]`)
      }
      cursor = close + 1
      continue
    }

    const start = cursor
    while (cursor < input.length && input[cursor] !== '.' && input[cursor] !== '[') {
      cursor += 1
    }
    const key = input.slice(start, cursor)
    if (!key) throw new Error(`Invalid JSON path near position ${cursor}`)
    segments.push(key)
  }

  return segments
}

export function queryJson(value: JsonValue, path: string): JsonValue {
  const segments = parseJsonPath(path)
  let current: JsonValue = value

  for (const segment of segments) {
    if (Array.isArray(current)) {
      if (typeof segment !== 'number' || segment >= current.length) {
        throw new Error(`Path segment does not exist: ${String(segment)}`)
      }
      current = current[segment] as JsonValue
      continue
    }

    if (isJsonObject(current)) {
      if (typeof segment !== 'string' || !Object.hasOwn(current, segment)) {
        throw new Error(`Path segment does not exist: ${String(segment)}`)
      }
      current = current[segment] as JsonValue
      continue
    }

    throw new Error(`Cannot read ${String(segment)} from a ${jsonType(current)}`)
  }

  return current
}

export function jsonType(value: JsonValue): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

export function sortJsonKeys(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(sortJsonKeys)
  if (!isJsonObject(value)) return value

  const sorted = Object.create(null) as Record<string, JsonValue>
  for (const key of Object.keys(value).sort()) {
    sorted[key] = sortJsonKeys(value[key] as JsonValue)
  }
  return sorted
}

function normalizeIndent(indent: number | undefined): number {
  if (indent === undefined) return 2
  if (!Number.isInteger(indent) || indent < 0 || indent > 10) {
    throw new Error('Indent must be an integer between 0 and 10')
  }
  return indent
}

function isJsonObject(value: JsonValue): value is { [key: string]: JsonValue } {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseQuotedPathKey(token: string): string {
  try {
    const key = JSON.parse(token) as unknown
    if (typeof key !== 'string') throw new Error('not a string')
    return key
  } catch {
    throw new Error(`Invalid quoted JSON path key: ${token}`)
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
