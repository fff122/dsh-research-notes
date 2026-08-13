import { Context } from '@deepseek-ai/cordis'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime, { type ToolRuntime as ToolRuntimeType } from '@deepseek-ai/dsh-tools'
import { describe, expect, it } from 'vitest'

import * as ResearchNotesPlugin from '../src/index.js'

describe('DeepSeek Harness mount', () => {
  it('loads on a real Cordis context and registers all tools', async () => {
    const ctx = new Context()

    try {
      await ctx.plugin(SystemPrompt)
      await ctx.plugin(ToolRuntime)
      await ctx.plugin(ResearchNotesPlugin)

      const tools = ctx as Context & { tools: ToolRuntimeType }
      const names = tools.tools
        .schemas()
        .map((schema) => schema.name)
        .sort()
      expect(names).toEqual([
        'research_note_export',
        'research_note_list',
        'research_note_save',
        'research_note_search',
      ])
    } finally {
      await ctx.fiber.dispose()
    }
  })
})
