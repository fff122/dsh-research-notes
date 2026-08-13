import path from 'node:path'

import { validateNoteId } from './schema.js'

export interface NotePaths {
  rootDir: string
  notesDir: string
  exportsDir: string
  indexFile: string
}

export function createNotePaths(workspaceDir: string): NotePaths {
  const rootDir = path.resolve(workspaceDir, '.dsh', 'research-notes')
  const notesDir = path.join(rootDir, 'notes')
  const exportsDir = path.join(rootDir, 'exports')

  return {
    rootDir,
    notesDir,
    exportsDir,
    indexFile: path.join(rootDir, 'index.json'),
  }
}

export function getNoteFilePath(paths: NotePaths, id: string): string {
  const safeId = validateNoteId(id)
  return path.join(paths.notesDir, `${safeId}.md`)
}

export function getExportFilePath(paths: NotePaths, fileName: string): string {
  if (!/^[a-z0-9][a-z0-9._-]{0,100}$/i.test(fileName)) {
    throw new Error('export file name has an invalid format')
  }

  return path.join(paths.exportsDir, fileName)
}
