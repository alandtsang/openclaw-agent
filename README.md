# OpenClaw Agent

A customizable, autonomous AI Assistant, built using the [Google Agent Development Kit (ADK) for TypeScript](https://github.com/google/agent-development-kit).

This agent has an established personality, operates with dynamic skills, integrates with Feishu (Lark) Bot via Event Subscriptions for bidirectional chat, and possesses **Self-Evolution capabilities**—meaning it can learn, write, and install its own skills at runtime!

## Key Features

- **Google ADK Native**: Typed multi-agent framework utilizing `InMemoryRunner`.
- **Model Agnostic**: Can use DeepSeek, GLM, OpenAI, or Google Gemini through LiteLLM proxy syntax.
- **Feishu Bidirectional Messaging**: Native `@larksuiteoapi/node-sdk` integration. Users can chat directly with the bot in Feishu via WebSocket (WS) mode—no public webhook endpoint required.
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

**POST `/chat`**
Send a message to the agent directly via REST API:
```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, update your memory that my favorite color is blue"}'
```

**GET `/health`**
Health check endpoint.

## Project Structure
- `src/agent/` - ADK Agent definitions, instructions, and skill loaders.
- `src/tools/` - Built-in native tools (FileSystem, Command Execution, Memory Update).
- `skills/` - Dynamically loaded skills. The agent writes to this directory to self-evolve.
- `src/server_main.ts` - Entry point for the Express and Feishu WebSocket server.
- `src/cli_main.ts` - Entry point for local CLI chat.
- `SOUL.md` & `MEMORY.md` - Agent persona definitions and dynamic persistent user memories.

## Security Notes
- The agent has access to `cmdTools` to execute shell commands. It is heavily instructed to avoid dangerous operations, but it operates within the privileges of the Node process.
- Avoid running the agent under the `root` user context.
