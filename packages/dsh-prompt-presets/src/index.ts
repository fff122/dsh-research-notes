import type { Context } from '@deepseek-ai/cordis'
import { defineTool, type ToolDefinition, type ToolRunContext } from '@deepseek-ai/dsh-tools'
import type ToolRuntime from '@deepseek-ai/dsh-tools'

import { renderTemplate } from './preset-schema.js'
import { PresetStore } from './preset-store.js'

export const name = 'dsh-prompt-presets'
export const inject = ['tools']

type HarnessContext = Context & { tools: ToolRuntime }

export function apply(ctx: HarnessContext): void {
  const store = new PresetStore(process.cwd())
  for (const tool of createToolDefinitions(store)) {
    ctx.tools.register(tool)
  }
}

export function createToolDefinitions(store: PresetStore): ToolDefinition[] {
  return [
    defineTool({
      name: 'preset_save',
      description: 'Save or update a reusable prompt template with optional tags and description.',
      parameters: {
        name: { type: 'string', required: true, description: 'A short name for the preset.' },
        template: {
          type: 'string',
          required: true,
          description: 'Prompt text. Use {{variable}} placeholders for values supplied later.',
        },
        description: {
          type: 'string',
          description: 'Optional explanation of when to use the preset.',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional labels for finding related presets.',
        },
      },
      output: {
        schema: presetSchema(),
        render: (_args, value) => [{ type: 'text', text: formatToolOutput(value) }],
      },
      async execute(args, _exec: ToolRunContext) {
        return store.save({
          name: args.name,
          template: args.template,
          ...(args.description === undefined ? {} : { description: args.description }),
          ...(args.tags === undefined ? {} : { tags: args.tags }),
        })
      },
    }),

    defineTool({
      name: 'preset_list',
      description: 'List saved prompt presets, optionally filtered by tags.',
      parameters: {
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional labels; a preset must contain every listed tag.',
        },
      },
      output: {
        schema: { type: 'array', items: presetSchema() } as const,
        render: (_args, value) => [{ type: 'text', text: formatToolOutput(value) }],
      },
      async execute(args, _exec: ToolRunContext) {
        return store.list(args.tags === undefined ? {} : { tags: args.tags })
      },
    }),

    defineTool({
      name: 'preset_apply',
      description: 'Render a saved prompt preset by replacing its {{variable}} placeholders.',
      parameters: {
        name: { type: 'string', required: true, description: 'The saved preset name.' },
        variables: {
          type: 'object',
          required: true,
          additionalProperties: true,
          description:
            'Values for placeholders. Strings, numbers, booleans, and JSON values are supported.',
        },
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            name: { type: 'string', required: true },
            rendered: { type: 'string', required: true },
            variables: { type: 'array', required: true, items: { type: 'string' } },
            missing: { type: 'array', required: true, items: { type: 'string' } },
          },
        } as const,
        render: (_args, value) => [{ type: 'text', text: formatToolOutput(value) }],
      },
      async execute(args, _exec: ToolRunContext) {
        const preset = await store.get(args.name)
        return { name: preset.name, ...renderTemplate(preset.template, args.variables) }
      },
    }),

    defineTool({
      name: 'preset_delete',
      description: 'Delete a saved prompt preset by name.',
      parameters: {
        name: { type: 'string', required: true, description: 'The saved preset name.' },
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            name: { type: 'string', required: true },
            deleted: { type: 'boolean', required: true },
          },
        } as const,
        render: (_args, value) => [{ type: 'text', text: formatToolOutput(value) }],
      },
      async execute(args, _exec: ToolRunContext) {
        return store.delete(args.name)
      },
    }),
  ]
}

function presetSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      name: { type: 'string', required: true },
      template: { type: 'string', required: true },
      tags: { type: 'array', required: true, items: { type: 'string' } },
      description: { type: 'string' },
      createdAt: { type: 'string', required: true },
      updatedAt: { type: 'string', required: true },
    },
  } as const
}

function formatToolOutput(value: unknown): string {
  return JSON.stringify(value, null, 2)
}
