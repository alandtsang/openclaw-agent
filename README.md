# OpenClaw Agent (Google ADK)

A customizable, autonomous AI Assistant similar to OpenClaw, built using the [Google Agent Development Kit (ADK) for TypeScript](https://github.com/google/agent-development-kit).

This agent has an established personality, can safely execute whitelisted shell commands, fetch time across timezones, and integrations with Feishu Webhooks to send notifications to group chats.

## Features

- **Built with Google ADK for TypeScript**: Native typed multi-agent framework
- **Model Agnostic**: Can use DeepSeek, GLM, OpenAI, or Google Gemini through LiteLLM proxy syntax
- **Tool Access**:
  - `getCurrentTime`: Timezone-aware time lookup
  - `executeCommand`: Secure, sandboxed shell command execution (whitelist-only)
  - `sendFeishuNotification`: Push text/rich-text messages to Feishu groups
  - `webSearch`: Extensible internet search interface
- **Dual Interfaces**: 
  - Express HTTP server for cloud/API integration
  - Interactive CLI for local debugging
- **Cloud Native**: Includes Docker and Docker-Compose support

## Prerequisites

- Node.js >= 20.0.0
- An API Key from an LLM provider (e.g., DeepSeek, Zhipu AI / GLM, or Google Gemini)
- (Optional) A Feishu custom bot webhook URL

## Installation

1. Clone the repository and install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Copy the `.env.example` file to create your own `.env` file:
   \`\`\`bash
   cp .env.example .env
   \`\`\`

3. Edit `.env` to configure your LLM and Feishu settings. 
   *(See .env.example for detailed configuration instructions)*.

## Usage

### CLI Interactive Mode
For quick local testing and chatting directly with the agent:
\`\`\`bash
npm run dev:cli
\`\`\`

### HTTP Server Mode
Start the Express server exposing the `/chat` and `/health` endpoints:
\`\`\`bash
# Development (with auto-reload)
npm run dev

# Production Build & Run
npm run build
npm start
\`\`\`

### HTTP Endpoints

**POST `/chat`**
Send a message to the agent:
\`\`\`bash
curl -X POST http://localhost:3000/chat \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Tell me the current time in Tokyo and list files in my home directory"}'
\`\`\`

**GET `/health`**
Used for load balancer health checking.

## Docker Deployment

1. Make sure your `.env` file is fully configured.
2. Build and run using Docker Compose:
   \`\`\`bash
   docker-compose up -d
   \`\`\`
3. Check logs:
   \`\`\`bash
   docker-compose logs -f
   \`\`\`

## Security Notes
- The `executeCommand` tool has a strictly hardcoded whitelist (`ls`, `pwd`, `date`, `whoami`, `uname`, etc.) and blocks all shell meta-characters (like `||`, `&&`, backticks) to prevent command injection. 
- Avoid running the agent under the `root` user context. The provided Dockerfile uses a non-root user `appuser`.
