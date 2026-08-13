import type { Context } from '@deepseek-ai/cordis'
import { defineTool, type ToolDefinition } from '@deepseek-ai/dsh-tools'
import type ToolRuntime from '@deepseek-ai/dsh-tools'

import { NoteStore } from './note-store.js'

export const name = 'dsh-research-notes'
export const inject = ['tools']

type HarnessContext = Context & { tools: ToolRuntime }

export function apply(ctx: HarnessContext): void {
  const store = new NoteStore(process.cwd())
  for (const tool of createToolDefinitions(store)) {
    ctx.tools.register(tool)
  }
}

export function createToolDefinitions(store: NoteStore): ToolDefinition[] {
  return [
    defineTool({
      name: 'research_note_save',
      description: 'Save a research note with optional source information and tags.',
      parameters: {
        title: { type: 'string', required: true, description: 'A short, readable note title.' },
        content: {
          type: 'string',
          required: true,
          description: 'The research finding or note body.',
        },
        sourceUrl: { type: 'string', description: 'An optional http or https source URL.' },
        sourceTitle: {
          type: 'string',
          description: 'An optional display title for the source URL.',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional labels used to filter and search notes.',
        },
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            id: { type: 'string', required: true },
            title: { type: 'string', required: true },
            path: { type: 'string', required: true },
            createdAt: { type: 'string', required: true },
          },
        },
        render: (_args, value) => [{ type: 'text', text: formatToolOutput(value) }],
      },
      async execute(args) {
        const note = await store.save(args)
        return {
          id: note.id,
          title: note.title,
          path: notePath(note.id),
          createdAt: note.createdAt,
        }
      },
    }),

    defineTool({
      name: 'research_note_list',
      description: 'List saved research note summaries, optionally filtered by tag.',
      parameters: {
        tag: { type: 'string', description: 'Only return notes containing this tag.' },
      },
      output: {
        schema: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              id: { type: 'string', required: true },
              title: { type: 'string', required: true },
              path: { type: 'string', required: true },
              tags: { type: 'array', required: true, items: { type: 'string' } },
              updatedAt: { type: 'string', required: true },
            },
          },
        },
        render: (_args, value) => [{ type: 'text', text: formatToolOutput(value) }],
      },
      async execute(args) {
        return store.list(args)
      },
    }),

    defineTool({
      name: 'research_note_search',
      description: 'Search saved research notes by title, content, source, or tag.',
      parameters: {
        query: { type: 'string', required: true, description: 'A non-empty search phrase.' },
      },
      output: {
        schema: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              note: {
                type: 'object',
                required: true,
                additionalProperties: false,
                properties: {
                  id: { type: 'string', required: true },
                  title: { type: 'string', required: true },
                  path: { type: 'string', required: true },
                  tags: { type: 'array', required: true, items: { type: 'string' } },
                  updatedAt: { type: 'string', required: true },
                },
              },
              excerpt: { type: 'string', required: true },
            },
          },
        },
        render: (_args, value) => [{ type: 'text', text: formatToolOutput(value) }],
      },
      async execute(args) {
        return store.search(args)
      },
    }),

    defineTool({
      name: 'research_note_export',
      description: 'Export saved research notes as a readable Markdown research pack.',
      parameters: {
        ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional note IDs; omit to export all notes.',
        },
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            filePath: { type: 'string', required: true },
            count: { type: 'integer', required: true },
          },
        },
        render: (_args, value) => [{ type: 'text', text: formatToolOutput(value) }],
      },
      async execute(args) {
        return store.export(args)
      },
    }),
  ]
}

function notePath(id: string): string {
  return `${process.cwd()}/.dsh/research-notes/notes/${id}.md`
}

function formatToolOutput(value: unknown): string {
  return JSON.stringify(value, null, 2)
}
