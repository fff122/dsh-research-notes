import type { NoteSource, ResearchNote } from './schema.js'
import {
  validateNoteId,
  validateTitle,
  validateContent,
  normaliseTags,
  validateSourceUrl,
} from './schema.js'

interface NoteFrontMatter {
  id: string
  title: string
  source?: NoteSource
  tags: string[]
  createdAt: string
  updatedAt: string
}

export function serializeNote(note: ResearchNote): string {
  const frontMatter: NoteFrontMatter = {
    id: note.id,
    title: note.title,
    ...(note.source ? { source: note.source } : {}),
    tags: note.tags,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  }

  return `---\n${JSON.stringify(frontMatter, null, 2)}\n---\n\n${note.content.trimEnd()}\n`
}

export function parseNoteFile(fileContent: string): ResearchNote {
  const match = /^---\n([\s\S]*?)\n---\n?\n?([\s\S]*)$/.exec(fileContent)

  if (!match) {
    throw new Error('note file is missing a valid front matter block')
  }

  const frontMatterText = match[1]
  const bodyText = match[2]
  if (frontMatterText === undefined || bodyText === undefined) {
    throw new Error('note file has incomplete front matter or body')
  }

  const frontMatter = parseFrontMatter(frontMatterText)
  const content = validateContent(bodyText.trimEnd())

  return {
    id: validateNoteId(frontMatter.id),
    title: validateTitle(frontMatter.title),
    content,
    ...(frontMatter.source ? { source: frontMatter.source } : {}),
    tags: normaliseTags(frontMatter.tags),
    createdAt: validateTimestamp(frontMatter.createdAt, 'createdAt'),
    updatedAt: validateTimestamp(frontMatter.updatedAt, 'updatedAt'),
  }
}

function parseFrontMatter(value: string): NoteFrontMatter {
  let parsed: unknown

  try {
    parsed = JSON.parse(value)
  } catch {
    throw new Error('note front matter is not valid JSON')
  }

  if (!isRecord(parsed)) {
    throw new Error('note front matter must be a JSON object')
  }

  if (
    typeof parsed.id !== 'string' ||
    typeof parsed.title !== 'string' ||
    !Array.isArray(parsed.tags) ||
    !parsed.tags.every((tag): tag is string => typeof tag === 'string') ||
    typeof parsed.createdAt !== 'string' ||
    typeof parsed.updatedAt !== 'string'
  ) {
    throw new Error('note front matter has missing or invalid fields')
  }

  const source = parseSource(parsed.source)

  return {
    id: parsed.id,
    title: parsed.title,
    ...(source ? { source } : {}),
    tags: parsed.tags,
    createdAt: parsed.createdAt,
    updatedAt: parsed.updatedAt,
  }
}

function parseSource(value: unknown): NoteSource | undefined {
  if (value === undefined) {
    return undefined
  }

  if (!isRecord(value) || typeof value.url !== 'string') {
    throw new Error('note source has an invalid format')
  }

  const url = validateSourceUrl(value.url)
  if (url === undefined) {
    throw new Error('note source URL must not be empty')
  }

  if (value.title !== undefined && typeof value.title !== 'string') {
    throw new Error('note source title must be a string')
  }

  return value.title ? { url, title: value.title } : { url }
}

function validateTimestamp(value: string, fieldName: string): string {
  if (Number.isNaN(Date.parse(value))) {
    throw new Error(`${fieldName} must be an ISO date string`)
  }

  return value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
