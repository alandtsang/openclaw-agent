# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands
- `npm run dev` - Start in HTTP + WebSocket server mode (recommended for Feishu bot integration)
- `npm run dev:cli` - Run in interactive CLI mode for local testing
- `npm run build` - Compile TypeScript to JavaScript
- `npm run start` - Run the built server (after `npm run build`)
- `npm run typecheck` - Run TypeScript type checking without emitting code

## Architecture Overview

This is an autonomous AI agent built on Google Agent Development Kit (ADK) with self-evolution capabilities. The agent integrates with Feishu (Lark) for bidirectional messaging and supports scheduled cron tasks.

### Entry Points
- **`src/server_main.ts`** - Express server with Feishu WebSocket integration. Start with `npm run dev` for development or `npm run build && npm start` for production.
- **`src/cli_main.ts`** - Interactive CLI chat interface for local testing. Use `npm run dev:cli`.

### Core Components
- **`src/agent/`** - Agent initialization with dynamic tool loading:
  - `index.ts` - Creates the LlmAgent with proxy support and loads all tools
  - `skillsManager.ts` - Dynamically loads skills from `skills/` directory, reading both SKILL.md prompts and exporting FunctionTools from index.ts
  - `instructions.ts` - Constructs the system prompt by combining SOUL.md, CLAUDE.md, MEMORY.md, and loaded skill prompts
  - `hookExecutor.ts` - Executes pre/post tool hooks and session lifecycle hooks

- **`src/tools/`** - Built-in tools:
  - `fsTools.ts` - Filesystem operations (read, write, create directories)
  - `cmdTools.ts` - Shell command execution
  - `updateMemory.ts` - Updates MEMORY.md with user preferences
  - `cronTools.ts` - Cron job management (add, list, remove)
  - `anthropicInstaller.ts` - Installs new skills dynamically

- **`src/cron/`** - Persistent cron job scheduler using `croner`:
  - Jobs persist to `data/cron-jobs.json`
  - Executes in isolated agent sessions
  - Supports Feishu notification delivery

- **`skills/`** - Dynamic skill modules loaded at runtime. Each skill is a subdirectory containing:
  - `SKILL.md` - Required YAML frontmatter with `name` and `description`, plus markdown instructions
  - `index.ts` - Optional; exports ADK FunctionTool instances

### Skills Structure
Skills without `index.ts` are "declarative" - only the SKILL.md prompt loads. Skills with code export FunctionTools:

```typescript
import { FunctionTool } from '@google/adk';
import { z } from 'zod/v4';

export const myTool = new FunctionTool({
    name: 'tool_name',
    description: 'What this tool does',
    parameters: z.object({
        param: z.string().describe('Parameter description')
    }),
    execute: async ({ param }) => {
        return { result: 'success' };
    }
});
```

SKILL.md requires YAML frontmatter:
```yaml
---
name: skill-name
description: When to trigger this skill and what it does
metadata:
  hooks: ['pre-tool', 'post-tool', 'session-end']
---

# Skill instructions...
```

## HTTP Endpoints
- `POST /chat` - Send message to agent via REST API
- `GET /health` - Health check
- `GET /cron/jobs` - List scheduled cron jobs
- `DELETE /cron/jobs/:id` - Delete a cron job

## Memory & Identity
- `MEMORY.md` - User facts and preferences (auto-updated by the agent)
- `SOUL.md` - Agent persona and behavioral rules

## Environment Variables
Configure in `.env`:
- `LLM_API_KEY` - LLM provider API key
- `LLM_MODEL` - Model ID (default: `gemini-1.5-flash`)
- `LLM_BASE_URL` - Custom API endpoint (useful for proxy/gateway)
- `LLM_PROXY` / `HTTPS_PROXY` - Proxy for LLM calls
- `FEISHU_APP_ID` / `FEISHU_APP_SECRET` - Feishu bot credentials
- `FEISHU_CRON_CHAT_ID` - Default chat for cron notifications
- `PORT` - Server port (default: 3000)
