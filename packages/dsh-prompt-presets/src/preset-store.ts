import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'

import {
  createPreset,
  isPreset,
  normalizeNameForLookup,
  normalizePresetName,
  normalizeSaveInput,
  normalizeTags,
  type Preset,
  type PresetFilter,
  type SavePresetInput,
} from './preset-schema.js'

const DATA_DIRECTORY = '.dsh/prompt-presets'
const PRESET_FILE = 'presets.json'

export class PresetStore {
  private readonly workspace: string
  private readonly dataDirectory: string
  private readonly presetFile: string

  public constructor(workspace: string) {
    this.workspace = resolve(workspace)
    this.dataDirectory = resolve(this.workspace, DATA_DIRECTORY)
    this.presetFile = join(this.dataDirectory, PRESET_FILE)

    if (!this.dataDirectory.startsWith(`${this.workspace}/`)) {
      throw new Error('Preset data directory must remain inside the workspace.')
    }
  }

  public async save(input: SavePresetInput): Promise<Preset> {
    const normalized = normalizeSaveInput(input)
    const presets = await this.readPresets()
    const existingIndex = presets.findIndex(
      (preset) => normalizeNameForLookup(preset.name) === normalizeNameForLookup(normalized.name),
    )
    const now = new Date().toISOString()
    let preset: Preset
    if (existingIndex === -1) {
      preset = createPreset(normalized, now)
      presets.push(preset)
    } else {
      const existing = presets[existingIndex]
      if (existing === undefined) throw new Error('Preset list changed while saving.')
      const description = normalized.description ?? existing.description
      preset = {
        name: normalized.name,
        template: normalized.template,
        tags: normalized.tags ?? existing.tags,
        createdAt: existing.createdAt,
        updatedAt: now,
        ...(description === undefined ? {} : { description }),
      }
      presets[existingIndex] = preset
    }

    await this.writePresets(presets)
    return preset
  }

  public async list(filter: PresetFilter = {}): Promise<Preset[]> {
    const tags = normalizeTags(filter.tags)
    const presets = await this.readPresets()

    return presets
      .filter((preset) => tags.length === 0 || tags.every((tag) => preset.tags.includes(tag)))
      .sort((left, right) => left.name.localeCompare(right.name))
  }

  public async get(name: string): Promise<Preset> {
    const normalizedName = normalizePresetName(name)
    const preset = (await this.readPresets()).find(
      (candidate) =>
        normalizeNameForLookup(candidate.name) === normalizeNameForLookup(normalizedName),
    )
    if (preset === undefined) throw new Error(`Preset not found: ${normalizedName}.`)
    return preset
  }

  public async delete(name: string): Promise<{ name: string; deleted: boolean }> {
    const normalizedName = normalizePresetName(name)
    const presets = await this.readPresets()
    const index = presets.findIndex(
      (preset) => normalizeNameForLookup(preset.name) === normalizeNameForLookup(normalizedName),
    )
    if (index === -1) return { name: normalizedName, deleted: false }

    const [deleted] = presets.splice(index, 1)
    await this.writePresets(presets)
    return { name: deleted?.name ?? normalizedName, deleted: true }
  }

  private async readPresets(): Promise<Preset[]> {
    try {
      const contents = await readFile(this.presetFile, 'utf8')
      const parsed: unknown = JSON.parse(contents)
      if (!Array.isArray(parsed) || !parsed.every(isPreset)) {
        throw new Error('Preset data is not a valid preset list.')
      }
      return parsed
    } catch (error: unknown) {
      if (isMissingFileError(error)) return []
      if (error instanceof SyntaxError) {
        throw new Error('Preset data is not valid JSON. Restore or remove the preset data file.')
      }
      throw error
    }
  }

  private async writePresets(presets: Preset[]): Promise<void> {
    await mkdir(this.dataDirectory, { recursive: true })
    const temporaryFile = join(dirname(this.presetFile), `${PRESET_FILE}.${process.pid}.tmp`)
    await writeFile(temporaryFile, `${JSON.stringify(presets, null, 2)}\n`, 'utf8')
    await rename(temporaryFile, this.presetFile)
  }
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as NodeJS.ErrnoException).code === 'ENOENT'
  )
}
