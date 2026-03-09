# OpenClaw Agent

A customizable, autonomous AI Assistant, built using the [Google Agent Development Kit (ADK) for TypeScript](https://github.com/google/agent-development-kit).

This agent has an established personality, operates with dynamic skills, integrates with Feishu (Lark) Bot via Event Subscriptions for bidirectional chat, supports **scheduled cron tasks**, and possesses **Self-Evolution capabilities**—meaning it can learn, write, and install its own skills at runtime!

## Key Features

- **Google ADK Native**: Typed multi-agent framework utilizing `InMemoryRunner`.
- **Model Agnostic**: Can use DeepSeek, GLM, OpenAI, or Google Gemini through LiteLLM proxy syntax.
- **Feishu Bidirectional Messaging**: Native `@larksuiteoapi/node-sdk` integration. Users can chat directly with the bot in Feishu via WebSocket (WS) mode—no public webhook endpoint required.
- **Scheduled Cron Tasks**: Built-in cron job system powered by [`croner`](https://github.com/hexagon/croner). Users can create, list, and remove scheduled tasks through natural language. Jobs persist across restarts and run in isolated agent sessions. Results are pushed to Feishu automatically.
- **Self-Evolution & Dynamic Skills**:
  - Automatically loads tools from the `skills/` directory.
  - Using built-in `fsTools` and `cmdTools`, the agent can create new folders, write TypeScript code, install npm dependencies, and generate new ADK `FunctionTool` modules for itself upon user request.
- **Persistent Memory**: Uses `updateMemory` tool to record user preferences and facts dynamically to `MEMORY.md`.

## Prerequisites

- Node.js >= 20.0.0
- An API Key from an LLM provider (e.g., DeepSeek, GLM, or Google Gemini)
- A Feishu App with Bot capabilities and Event Subscriptions enabled (WebSocket mode).

## Installation

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Copy the `.env.example` file to create your own configuration:
   ```bash
   cp .env.example .env
   ```

3. Edit `.env` to configure your LLM and Feishu settings:
   ```env
   FEISHU_APP_ID=cli_your_feishu_app_id
   FEISHU_APP_SECRET=your_feishu_app_secret
   LLM_API_KEY=your_gemini_or_deepseek_key
   ```

## Usage

### 1. HTTP + WebSocket Server Mode (Recommended)
This starts the Express server and connects the Feishu WS listener. Use this if you want to chat via the Feishu app.
```bash
# Build the typescript project
npm run build

# Start the server
npm start
```
*Once running, go to your Feishu Bot and send a message. The agent will process and reply.*

### 2. CLI Interactive Mode
For quick local testing and chatting directly with the agent without Feishu:
```bash
npm run dev:cli
```

### HTTP Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/chat` | Send a message to the agent via REST API |
| `GET` | `/health` | Health check endpoint |
| `GET` | `/cron/jobs` | List all scheduled cron jobs |
| `DELETE` | `/cron/jobs/:id` | Delete a cron job by ID |

**Example:**
```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, update your memory that my favorite color is blue"}'
```

### Cron Jobs

The agent can create and manage scheduled tasks through natural language:

- **Create**: "每天早上 9 点提醒我看邮件" / "每 5 分钟检查一下服务器状态"
- **List**: "列出所有定时任务"
- **Delete**: "删除那个提醒任务"

Under the hood, the agent uses three tools (`cron_add`, `cron_list`, `cron_remove`) backed by a persistent JSON store (`data/cron-jobs.json`). Job results are automatically sent to Feishu via the Lark SDK.

You can optionally set `FEISHU_CRON_CHAT_ID` in `.env` to specify which Feishu chat receives cron notifications. If unset, it auto-captures the chat ID from the first incoming message.

## Project Structure

```
├── src/
│   ├── agent/           # ADK Agent definitions, instructions, skill loaders
│   ├── cron/            # Cron scheduler, persistent store, module exports
│   ├── tools/           # Built-in tools (FS, CMD, Memory, Cron, Anthropic installer)
│   ├── server_main.ts   # Express + Feishu WS server entry point
│   └── cli_main.ts      # Local CLI chat entry point
├── skills/              # Dynamically loaded skills (agent self-evolves here)
│   ├── feishu/          # Feishu notification skill
│   ├── skill-creator/   # Meta-skill for creating new skills
│   ├── time-query/      # Time query skill
│   ├── weather/         # Weather query skill
│   └── web-search/      # Web search skill
├── data/                # Runtime data (cron-jobs.json, auto-created)
├── SOUL.md              # Agent persona definition
└── MEMORY.md            # Dynamic persistent user memories
```

## Security Notes
- The agent has access to `cmdTools` to execute shell commands. It is heavily instructed to avoid dangerous operations, but it operates within the privileges of the Node process.
- Avoid running the agent under the `root` user context.
