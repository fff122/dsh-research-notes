import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { parseNoteFile, serializeNote } from './note-format.js'
import {
  createNotePaths,
  getExportFilePath,
  getNoteFilePath,
  type NotePaths,
} from './path-policy.js'
import {
  normaliseTags,
  toNoteSource,
  validateContent,
  validateNoteId,
  validateSearchQuery,
  validateTitle,
  type ExportNotesInput,
  type ListNotesInput,
  type NoteSummary,
  type ResearchNote,
  type SaveNoteInput,
  type SearchMatch,
  type SearchNotesInput,
} from './schema.js'

interface StoredIndexEntry {
  id: string
  title: string
  source?: ResearchNote['source']
  tags: string[]
  createdAt: string
  updatedAt: string
}

interface StoredIndex {
  version: 1
  notes: StoredIndexEntry[]
}

export interface NoteStoreOptions {
  now?: () => Date
  idFactory?: (now: Date) => string
}

export class NoteStore {
  private readonly now: () => Date
  private readonly idFactory: (now: Date) => string

  constructor(
    private readonly workspaceDir: string,
    private readonly paths = createNotePaths(workspaceDir),
    options: NoteStoreOptions = {},
  ) {
    this.now = options.now ?? (() => new Date())
    this.idFactory = options.idFactory ?? createNoteId
  }

  async save(input: SaveNoteInput): Promise<ResearchNote> {
    const now = this.now()
    const source = toNoteSource(input.sourceUrl, input.sourceTitle)
    const note: ResearchNote = {
      id: this.idFactory(now),
      title: validateTitle(input.title),
      content: validateContent(input.content),
      ...(source ? { source } : {}),
      tags: normaliseTags(input.tags),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    }

    await this.ensureDirectories()
    await writeAtomically(getNoteFilePath(this.paths, note.id), serializeNote(note))
    await this.updateIndex(note)
    return note
  }

  async list(input: ListNotesInput = {}): Promise<NoteSummary[]> {
    const index = await this.readIndex()
    const requestedTag = input.tag?.trim().toLowerCase()

    return index.notes
      .filter((entry) => requestedTag === undefined || entry.tags.includes(requestedTag))
      .sort(compareUpdatedAt)
      .map((entry) => this.toSummary(entry))
  }

  async search(input: SearchNotesInput): Promise<SearchMatch[]> {
    const query = validateSearchQuery(input.query)
    const summaries = await this.list()
    const matches: SearchMatch[] = []

    for (const summary of summaries) {
      const note = await this.read(summary.id)
      const searchableText = [
        note.title,
        note.content,
        note.source?.url ?? '',
        note.source?.title ?? '',
        ...note.tags,
      ]
        .join('\n')
        .toLowerCase()

      const matchIndex = searchableText.indexOf(query)
      if (matchIndex === -1) {
        continue
      }

      matches.push({
        note: summary,
        excerpt: createExcerpt(note.content, query, matchIndex),
      })
    }

    return matches
  }

  async export(input: ExportNotesInput = {}): Promise<{ filePath: string; count: number }> {
    const summaries = await this.list()
    const requestedIds = input.ids?.map(validateNoteId)
    const selected = requestedIds
      ? summaries.filter((summary) => requestedIds.includes(summary.id))
      : summaries

    if (requestedIds && selected.length !== requestedIds.length) {
      const selectedIds = new Set(selected.map((summary) => summary.id))
      const missingId = requestedIds.find((id) => !selectedIds.has(id))
      throw new Error(`cannot export missing note: ${missingId}`)
    }

    const notes = await Promise.all(selected.map((summary) => this.read(summary.id)))
    const markdown = renderExport(notes, this.now())
    const fileName = `research-notes-${formatFileTimestamp(this.now())}.md`
    const filePath = getExportFilePath(this.paths, fileName)

    await this.ensureDirectories()
    await writeAtomically(filePath, markdown)

    return { filePath, count: notes.length }
  }

  async read(id: string): Promise<ResearchNote> {
    const filePath = getNoteFilePath(this.paths, validateNoteId(id))
    const content = await readFile(filePath, 'utf8')
    return parseNoteFile(content)
  }

  private async ensureDirectories(): Promise<void> {
    await mkdir(this.paths.notesDir, { recursive: true })
    await mkdir(this.paths.exportsDir, { recursive: true })
  }

  private async updateIndex(note: ResearchNote): Promise<void> {
    const index = await this.readIndex()
    const newEntry = toIndexEntry(note)
    const existingIndex = index.notes.findIndex((entry) => entry.id === note.id)

    if (existingIndex === -1) {
      index.notes.push(newEntry)
    } else {
      index.notes[existingIndex] = newEntry
    }

    await writeAtomically(this.paths.indexFile, `${JSON.stringify(index, null, 2)}\n`)
  }

  private async readIndex(): Promise<StoredIndex> {
    try {
      const content = await readFile(this.paths.indexFile, 'utf8')
      return parseIndex(content)
    } catch (error) {
      if (!isFileNotFound(error)) {
        return this.rebuildIndex()
      }

      return { version: 1, notes: [] }
    }
  }

  private async rebuildIndex(): Promise<StoredIndex> {
    let fileNames: string[]

    try {
      fileNames = await readdir(this.paths.notesDir)
    } catch (error) {
      if (isFileNotFound(error)) {
        return { version: 1, notes: [] }
      }

      throw error
    }

    const entries: StoredIndexEntry[] = []
    for (const fileName of fileNames.filter((name) => name.endsWith('.md'))) {
      const id = fileName.slice(0, -'.md'.length)

      try {
        const note = await this.read(id)
        entries.push(toIndexEntry(note))
      } catch {
        // Ignore manually created or partially written files until they are valid notes.
      }
    }

    return { version: 1, notes: entries }
  }

  private toSummary(entry: StoredIndexEntry): NoteSummary {
    return {
      id: entry.id,
      title: entry.title,
      ...(entry.source ? { source: entry.source } : {}),
      tags: entry.tags,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      path: getNoteFilePath(this.paths, entry.id),
    }
  }
}

function parseIndex(content: string): StoredIndex {
  const value: unknown = JSON.parse(content)

  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.notes)) {
    throw new Error('note index has an invalid format')
  }

  const notes = value.notes.map(parseIndexEntry)
  return { version: 1, notes }
}

function parseIndexEntry(value: unknown): StoredIndexEntry {
  if (!isRecord(value)) {
    throw new Error('note index entry has an invalid format')
  }

  if (
    typeof value.id !== 'string' ||
    typeof value.title !== 'string' ||
    !Array.isArray(value.tags) ||
    !value.tags.every((tag): tag is string => typeof tag === 'string') ||
    typeof value.createdAt !== 'string' ||
    typeof value.updatedAt !== 'string'
  ) {
    throw new Error('note index entry has missing or invalid fields')
  }

  const id = validateNoteId(value.id)
  const source = value.source
  if (source !== undefined && !isRecord(source)) {
    throw new Error('note index source has an invalid format')
  }

  return {
    id,
    title: validateTitle(value.title),
    ...(source ? { source: source as ResearchNote['source'] } : {}),
    tags: normaliseTags(value.tags),
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  }
}

function toIndexEntry(note: ResearchNote): StoredIndexEntry {
  return {
    id: note.id,
    title: note.title,
    ...(note.source ? { source: note.source } : {}),
    tags: note.tags,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  }
}

function compareUpdatedAt(left: StoredIndexEntry, right: StoredIndexEntry): number {
  return right.updatedAt.localeCompare(left.updatedAt)
}

function createExcerpt(content: string, query: string, fallbackIndex: number): string {
  const contentIndex = content.toLowerCase().indexOf(query)
  const matchIndex = contentIndex === -1 ? fallbackIndex : contentIndex
  const start = Math.max(0, matchIndex - 80)
  const end = Math.min(content.length, matchIndex + query.length + 120)
  const prefix = start > 0 ? '…' : ''
  const suffix = end < content.length ? '…' : ''
  return `${prefix}${content.slice(start, end).trim()}${suffix}`
}

function renderExport(notes: ResearchNote[], generatedAt: Date): string {
  const sections = notes.map((note) => {
    const source = note.source
      ? `\n来源：${note.source.title ? `[${note.source.title}](${note.source.url})` : note.source.url}`
      : ''
    const tags =
      note.tags.length > 0 ? `\n标签：${note.tags.map((tag) => `\`${tag}\``).join(', ')}` : ''

    return `## ${note.title}\n\n${note.content}${source}${tags}\n\n<!-- note-id: ${note.id} -->`
  })

  const body = sections.length > 0 ? `\n\n${sections.join('\n\n')}` : '\n\n暂无笔记。'
  return `# Research Notes\n\n生成时间：${generatedAt.toISOString()}${body}\n`
}

function formatFileTimestamp(date: Date): string {
  return date.toISOString().replace(/[:.]/g, '-').replace(/Z$/, 'Z')
}

async function writeAtomically(filePath: string, content: string): Promise<void> {
  const temporaryPath = `${filePath}.tmp-${process.pid}-${Date.now()}`
  await writeFile(temporaryPath, content, 'utf8')
  await rename(temporaryPath, filePath)
}

function isFileNotFound(error: unknown): boolean {
  return isRecord(error) && error.code === 'ENOENT'
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function createNoteId(now: Date): string {
  const timestamp = now
    .toISOString()
    .replace(/[^0-9]/g, '')
    .slice(0, 14)
  const randomPart = Math.random().toString(36).slice(2, 8)
  return `${timestamp}-${randomPart}`
}
