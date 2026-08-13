export type Preset = {
  name: string
  template: string
  tags: string[]
  description?: string
  createdAt: string
  updatedAt: string
}

export type SavePresetInput = {
  name: string
  template: string
  tags?: string[]
  description?: string
}

export type PresetFilter = {
  tags?: string[]
}

export type RenderedPreset = {
  name: string
  rendered: string
  variables: string[]
  missing: string[]
}

const VARIABLE_PATTERN = /{{\s*([A-Za-z_][A-Za-z0-9_]*)\s*}}/g

export function normalizePresetName(name: string): string {
  const normalized = name.trim()
  if (normalized.length === 0) throw new Error('Preset name cannot be empty.')
  if (normalized.length > 80) throw new Error('Preset name cannot exceed 80 characters.')
  if (/[\\/]/u.test(normalized)) throw new Error('Preset name cannot contain a slash.')
  return normalized
}

export function normalizeNameForLookup(name: string): string {
  return name.trim().toLocaleLowerCase('en-US')
}

export function normalizeTemplate(template: string): string {
  const normalized = template.trim()
  if (normalized.length === 0) throw new Error('Preset template cannot be empty.')
  if (normalized.length > 200_000)
    throw new Error('Preset template cannot exceed 200000 characters.')
  return normalized
}

export function normalizeTags(tags: string[] | undefined): string[] {
  if (tags === undefined) return []

  const normalized = tags.map((tag) => tag.trim().toLowerCase()).filter((tag) => tag.length > 0)

  return [...new Set(normalized)]
}

export function extractVariables(template: string): string[] {
  const variables: string[] = []
  const seen = new Set<string>()

  for (const match of template.matchAll(VARIABLE_PATTERN)) {
    const variable = match[1]
    if (variable !== undefined && !seen.has(variable)) {
      seen.add(variable)
      variables.push(variable)
    }
  }

  return variables
}

export function renderTemplate(
  template: string,
  variables: Record<string, unknown>,
): {
  rendered: string
  variables: string[]
  missing: string[]
} {
  const variableNames = extractVariables(template)
  const missing = variableNames.filter(
    (name) => !(name in variables) || variables[name] === undefined,
  )
  const rendered = template.replace(VARIABLE_PATTERN, (_match, name: string) => {
    if (!(name in variables) || variables[name] === undefined) return `{{${name}}}`
    return stringifyVariable(variables[name])
  })

  return { rendered, variables: variableNames, missing }
}

export function createPreset(input: SavePresetInput, now = new Date().toISOString()): Preset {
  const name = normalizePresetName(input.name)
  const template = normalizeTemplate(input.template)
  const tags = normalizeTags(input.tags)
  const description = input.description?.trim()

  return {
    name,
    template,
    tags,
    ...(description === undefined || description.length === 0 ? {} : { description }),
    createdAt: now,
    updatedAt: now,
  }
}

export function normalizeSaveInput(input: SavePresetInput): SavePresetInput {
  const name = normalizePresetName(input.name)
  const template = normalizeTemplate(input.template)
  const tags = normalizeTags(input.tags)
  const description = input.description?.trim()

  return {
    name,
    template,
    tags,
    ...(description === undefined || description.length === 0 ? {} : { description }),
  }
}

export function isPreset(value: unknown): value is Preset {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<Preset>
  return (
    typeof candidate.name === 'string' &&
    typeof candidate.template === 'string' &&
    Array.isArray(candidate.tags) &&
    candidate.tags.every((tag) => typeof tag === 'string') &&
    (candidate.description === undefined || typeof candidate.description === 'string') &&
    typeof candidate.createdAt === 'string' &&
    typeof candidate.updatedAt === 'string'
  )
}

function stringifyVariable(value: unknown): string {
  if (typeof value === 'string') return value
  if (value === null) return ''
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)

  const json = JSON.stringify(value)
  return json === undefined ? '' : json
}
