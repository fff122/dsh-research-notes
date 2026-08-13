import type { Context } from '@deepseek-ai/cordis'
import { defineTool, type ToolDefinition } from '@deepseek-ai/dsh-tools'
import type ToolRuntime from '@deepseek-ai/dsh-tools'

import { TaskStore } from './task-store.js'

export const name = 'dsh-task-checklist'
export const inject = ['tools']

type HarnessContext = Context & { tools: ToolRuntime }

export function apply(ctx: HarnessContext): void {
  const store = new TaskStore(process.cwd())
  for (const tool of createToolDefinitions(store)) {
    ctx.tools.register(tool)
  }
}

export function createToolDefinitions(store: TaskStore): ToolDefinition[] {
  return [
    defineTool({
      name: 'task_create',
      description: 'Create a local task with optional details, tags, and priority.',
      parameters: {
        title: { type: 'string', required: true, description: 'A short task title.' },
        details: { type: 'string', description: 'Optional details or acceptance criteria.' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional labels for filtering, such as work or personal.',
        },
        priority: {
          type: 'string',
          enum: ['low', 'normal', 'high'],
          description: 'Task priority. Defaults to normal.',
        },
      },
      output: {
        schema: taskSchema(),
        render: (_args, value) => [{ type: 'text', text: formatToolOutput(value) }],
      },
      async execute(args) {
        return store.create({
          title: args.title,
          ...(args.details === undefined ? {} : { details: args.details }),
          ...(args.tags === undefined ? {} : { tags: args.tags }),
          ...(args.priority === undefined ? {} : { priority: args.priority }),
        })
      },
    }),

    defineTool({
      name: 'task_list',
      description: 'List local tasks, optionally filtered by status or one or more tags.',
      parameters: {
        status: {
          type: 'string',
          enum: ['todo', 'done'],
          description: 'Optional task status filter.',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional tags; returned tasks must contain every listed tag.',
        },
      },
      output: {
        schema: { type: 'array', items: taskSchema() } as const,
        render: (_args, value) => [{ type: 'text', text: formatToolOutput(value) }],
      },
      async execute(args) {
        return store.list({
          ...(args.status === undefined ? {} : { status: args.status }),
          ...(args.tags === undefined ? {} : { tags: args.tags }),
        })
      },
    }),

    defineTool({
      name: 'task_complete',
      description:
        'Mark one local task as complete using an id returned by task_create or task_list.',
      parameters: {
        id: { type: 'string', required: true, description: 'The task id to mark complete.' },
      },
      output: {
        schema: taskSchema(),
        render: (_args, value) => [{ type: 'text', text: formatToolOutput(value) }],
      },
      async execute(args) {
        return store.complete(args.id)
      },
    }),

    defineTool({
      name: 'task_export_markdown',
      description: 'Export matching local tasks as a readable Markdown checklist.',
      parameters: {
        status: {
          type: 'string',
          enum: ['todo', 'done'],
          description: 'Optional task status filter.',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional tags; exported tasks must contain every listed tag.',
        },
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            markdown: { type: 'string', required: true },
            count: { type: 'integer', required: true },
          },
        } as const,
        render: (_args, value) => [{ type: 'text', text: formatToolOutput(value) }],
      },
      async execute(args) {
        return store.exportMarkdown({
          ...(args.status === undefined ? {} : { status: args.status }),
          ...(args.tags === undefined ? {} : { tags: args.tags }),
        })
      },
    }),
  ]
}

function taskSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      id: { type: 'string', required: true },
      title: { type: 'string', required: true },
      details: { type: 'string' },
      tags: { type: 'array', required: true, items: { type: 'string' } },
      priority: { type: 'string', required: true },
      status: { type: 'string', required: true },
      createdAt: { type: 'string', required: true },
      completedAt: { type: 'string' },
    },
  } as const
}

function formatToolOutput(value: unknown): string {
  return JSON.stringify(value, null, 2)
}
