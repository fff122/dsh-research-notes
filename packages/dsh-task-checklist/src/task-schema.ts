export const TASK_STATUSES = ['todo', 'done'] as const
export const TASK_PRIORITIES = ['low', 'normal', 'high'] as const

export type TaskStatus = (typeof TASK_STATUSES)[number]
export type TaskPriority = (typeof TASK_PRIORITIES)[number]

export interface Task {
  id: string
  title: string
  details?: string
  tags: string[]
  priority: TaskPriority
  status: TaskStatus
  createdAt: string
  completedAt?: string
}

export interface CreateTaskInput {
  title: string
  details?: string
  tags?: string[]
  priority?: TaskPriority
}

export interface ListTaskFilter {
  status?: TaskStatus
  tags?: string[]
}

const MAX_TITLE_LENGTH = 200
const MAX_DETAILS_LENGTH = 10_000
const MAX_TAG_COUNT = 20
const MAX_TAG_LENGTH = 40

export function createTask(input: CreateTaskInput, now = new Date()): Task {
  const title = normalizeTitle(input.title)
  const details = normalizeDetails(input.details)
  const tags = normalizeTags(input.tags)
  const priority = normalizePriority(input.priority)

  return {
    id: `task-${crypto.randomUUID()}`,
    title,
    ...(details === undefined ? {} : { details }),
    tags,
    priority,
    status: 'todo',
    createdAt: now.toISOString(),
  }
}

export function normalizeTitle(value: string): string {
  const title = value.trim()
  if (title.length === 0) throw new Error('Task title cannot be empty.')
  if (title.length > MAX_TITLE_LENGTH) {
    throw new Error(`Task title cannot exceed ${MAX_TITLE_LENGTH} characters.`)
  }
  return title
}

export function normalizeDetails(value: string | undefined): string | undefined {
  if (value === undefined) return undefined

  const details = value.trim()
  if (details.length === 0) return undefined
  if (details.length > MAX_DETAILS_LENGTH) {
    throw new Error(`Task details cannot exceed ${MAX_DETAILS_LENGTH} characters.`)
  }
  return details
}

export function normalizeTags(values: string[] | undefined): string[] {
  if (values === undefined) return []
  if (values.length > MAX_TAG_COUNT) {
    throw new Error(`A task can have at most ${MAX_TAG_COUNT} tags.`)
  }

  const normalized = values.map((value) => {
    const tag = value.trim().toLowerCase()
    if (tag.length === 0) throw new Error('Task tags cannot be empty.')
    if (tag.length > MAX_TAG_LENGTH) {
      throw new Error(`Task tags cannot exceed ${MAX_TAG_LENGTH} characters.`)
    }
    return tag
  })

  return [...new Set(normalized)].sort((left, right) => left.localeCompare(right))
}

export function normalizePriority(value: TaskPriority | undefined): TaskPriority {
  if (value === undefined) return 'normal'
  if (!TASK_PRIORITIES.includes(value)) {
    throw new Error(`Unknown task priority: ${String(value)}.`)
  }
  return value
}

export function normalizeStatus(value: TaskStatus | undefined): TaskStatus | undefined {
  if (value === undefined) return undefined
  if (!TASK_STATUSES.includes(value)) {
    throw new Error(`Unknown task status: ${String(value)}.`)
  }
  return value
}

export function ensureTaskId(value: string): string {
  const id = value.trim()
  if (!/^task-[0-9a-f-]{36}$/i.test(id)) {
    throw new Error('Task id must be a task id returned by task_create or task_list.')
  }
  return id
}

export function isTask(value: unknown): value is Task {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false

  const task = value as Partial<Task>
  return (
    typeof task.id === 'string' &&
    typeof task.title === 'string' &&
    Array.isArray(task.tags) &&
    task.tags.every((tag) => typeof tag === 'string') &&
    TASK_PRIORITIES.includes(task.priority as TaskPriority) &&
    TASK_STATUSES.includes(task.status as TaskStatus) &&
    typeof task.createdAt === 'string' &&
    (task.details === undefined || typeof task.details === 'string') &&
    (task.completedAt === undefined || typeof task.completedAt === 'string')
  )
}
