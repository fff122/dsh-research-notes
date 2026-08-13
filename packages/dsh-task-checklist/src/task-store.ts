import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'

import {
  createTask,
  ensureTaskId,
  isTask,
  normalizeStatus,
  normalizeTags,
  type CreateTaskInput,
  type ListTaskFilter,
  type Task,
} from './task-schema.js'

const DATA_DIRECTORY = '.dsh/task-checklist'
const TASK_FILE = 'tasks.json'

export class TaskStore {
  private readonly workspace: string
  private readonly dataDirectory: string
  private readonly taskFile: string

  public constructor(workspace: string) {
    this.workspace = resolve(workspace)
    this.dataDirectory = resolve(this.workspace, DATA_DIRECTORY)
    this.taskFile = join(this.dataDirectory, TASK_FILE)

    if (!this.dataDirectory.startsWith(`${this.workspace}/`)) {
      throw new Error('Task data directory must remain inside the workspace.')
    }
  }

  public async create(input: CreateTaskInput): Promise<Task> {
    const tasks = await this.readTasks()
    const task = createTask(input)
    tasks.push(task)
    await this.writeTasks(tasks)
    return task
  }

  public async list(filter: ListTaskFilter = {}): Promise<Task[]> {
    const status = normalizeStatus(filter.status)
    const tags = normalizeTags(filter.tags)
    const tasks = await this.readTasks()

    return tasks
      .filter((task) => status === undefined || task.status === status)
      .filter((task) => tags.length === 0 || tags.every((tag) => task.tags.includes(tag)))
      .sort(compareTasks)
  }

  public async complete(id: string): Promise<Task> {
    const taskId = ensureTaskId(id)
    const tasks = await this.readTasks()
    const task = tasks.find((candidate) => candidate.id === taskId)

    if (task === undefined) throw new Error(`Task not found: ${taskId}.`)
    if (task.status === 'done') return task

    const completed: Task = {
      ...task,
      status: 'done',
      completedAt: new Date().toISOString(),
    }
    const index = tasks.findIndex((candidate) => candidate.id === taskId)
    tasks[index] = completed
    await this.writeTasks(tasks)
    return completed
  }

  public async exportMarkdown(
    filter: ListTaskFilter = {},
  ): Promise<{ markdown: string; count: number }> {
    const tasks = await this.list(filter)
    const createdAt = new Date().toISOString()
    const lines = ['# Task Checklist', '', `Exported: ${createdAt}`, '']

    if (tasks.length === 0) {
      lines.push('_No matching tasks._', '')
      return { markdown: lines.join('\n'), count: 0 }
    }

    for (const task of tasks) {
      const check = task.status === 'done' ? 'x' : ' '
      const tags = task.tags.length === 0 ? '' : ` · #${task.tags.join(' #')}`
      lines.push(`- [${check}] **${escapeInlineMarkdown(task.title)}** (${task.priority})${tags}`)
      if (task.details !== undefined) lines.push(`  - ${escapeInlineMarkdown(task.details)}`)
      lines.push(`  - ID: \`${task.id}\``)
    }

    lines.push('')
    return { markdown: lines.join('\n'), count: tasks.length }
  }

  private async readTasks(): Promise<Task[]> {
    try {
      const contents = await readFile(this.taskFile, 'utf8')
      const parsed: unknown = JSON.parse(contents)
      if (!Array.isArray(parsed) || !parsed.every(isTask)) {
        throw new Error('Task data is not a valid task list.')
      }
      return parsed
    } catch (error: unknown) {
      if (isMissingFileError(error)) return []
      if (error instanceof SyntaxError) {
        throw new Error('Task data is not valid JSON. Restore or remove the task data file.')
      }
      throw error
    }
  }

  private async writeTasks(tasks: Task[]): Promise<void> {
    await mkdir(this.dataDirectory, { recursive: true })
    const temporaryFile = join(dirname(this.taskFile), `${TASK_FILE}.${process.pid}.tmp`)
    await writeFile(temporaryFile, `${JSON.stringify(tasks, null, 2)}\n`, 'utf8')
    await rename(temporaryFile, this.taskFile)
  }
}

function compareTasks(left: Task, right: Task): number {
  if (left.status !== right.status) return left.status === 'todo' ? -1 : 1

  const priorities: Record<Task['priority'], number> = { high: 0, normal: 1, low: 2 }
  const priorityDifference = priorities[left.priority] - priorities[right.priority]
  if (priorityDifference !== 0) return priorityDifference

  return right.createdAt.localeCompare(left.createdAt)
}

function escapeInlineMarkdown(value: string): string {
  return value.replace(/[\\`*_{}[\]<>()#+.!|]/g, '\\$&')
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as NodeJS.ErrnoException).code === 'ENOENT'
  )
}
