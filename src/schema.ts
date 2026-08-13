export const MAX_TITLE_LENGTH = 200
export const MAX_CONTENT_LENGTH = 50_000
export const MAX_TAG_COUNT = 20
export const MAX_TAG_LENGTH = 40

export interface NoteSource {
  url: string
  title?: string
}

export interface ResearchNote {
  id: string
  title: string
  content: string
  source?: NoteSource
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface NoteSummary {
  id: string
  title: string
  source?: NoteSource
  tags: string[]
  createdAt: string
  updatedAt: string
  path: string
}

export interface SaveNoteInput {
  title: string
  content: string
  sourceUrl?: string
  sourceTitle?: string
  tags?: string[]
}

export interface ListNotesInput {
  tag?: string
}

export interface SearchNotesInput {
  query: string
}

export interface ExportNotesInput {
  ids?: string[]
}

export interface SearchMatch {
  note: NoteSummary
  excerpt: string
}

export function validateTitle(title: string): string {
  const value = title.trim()

  if (value.length === 0) {
    throw new Error('title must not be empty')
  }

  if (value.length > MAX_TITLE_LENGTH) {
    throw new Error(`title must be at most ${MAX_TITLE_LENGTH} characters`)
  }

  return value
}

export function validateContent(content: string): string {
  if (content.trim().length === 0) {
    throw new Error('content must not be empty')
  }

  if (content.length > MAX_CONTENT_LENGTH) {
    throw new Error(`content must be at most ${MAX_CONTENT_LENGTH} characters`)
  }

  return content
}

export function validateSourceUrl(url: string | undefined): string | undefined {
  if (url === undefined || url.trim().length === 0) {
    return undefined
  }

  const value = url.trim()
  let parsed: URL

  try {
    parsed = new URL(value)
  } catch {
    throw new Error('sourceUrl must be a valid http or https URL')
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('sourceUrl must be a valid http or https URL')
  }

  return value
}

export function normaliseTags(tags: readonly string[] | undefined): string[] {
  if (tags === undefined) {
    return []
  }

  if (tags.length > MAX_TAG_COUNT) {
    throw new Error(`tags must contain at most ${MAX_TAG_COUNT} items`)
  }

  const normalised = tags.map((tag) => tag.trim().toLowerCase()).filter((tag) => tag.length > 0)

  for (const tag of normalised) {
    if (tag.length > MAX_TAG_LENGTH) {
      throw new Error(`each tag must be at most ${MAX_TAG_LENGTH} characters`)
    }
  }

  return [...new Set(normalised)].sort()
}

export function validateSearchQuery(query: string): string {
  const value = query.trim().toLowerCase()

  if (value.length === 0) {
    throw new Error('query must not be empty')
  }

  return value
}

export function validateNoteId(id: string): string {
  const value = id.trim()

  if (!/^[a-z0-9][a-z0-9-]{5,100}$/.test(value)) {
    throw new Error('id has an invalid format')
  }

  return value
}

export function toNoteSource(
  sourceUrl: string | undefined,
  sourceTitle: string | undefined,
): NoteSource | undefined {
  const url = validateSourceUrl(sourceUrl)

  if (url === undefined) {
    if (sourceTitle?.trim()) {
      throw new Error('sourceTitle requires sourceUrl')
    }

    return undefined
  }

  const title = sourceTitle?.trim()
  return title ? { url, title } : { url }
}
