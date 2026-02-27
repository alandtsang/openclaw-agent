/**
 * HTTP Server Entry Point
 *
 * Provides an Express HTTP server for cloud deployment.
 * Endpoints:
 *   - POST /chat   — Send a message to the agent
 *   - GET  /health — Health check for load balancers
 */

import 'dotenv/config';
import express from 'express';
import { InMemoryRunner } from '@google/adk';
import type { Content } from '@google/genai';
import { initAgent } from './agent/index.js';

const app = express();
app.use(express.json());

// We will instantiate this when the server starts.
let runner: InMemoryRunner;
let agentName = '';

/**
 * Health check endpoint
 */
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        agent: agentName,
        timestamp: new Date().toISOString(),
    });
});

/**
 * Chat endpoint — send a message to the agent and get a response
 *
 * Request body:
 *   { "message": "string", "session_id"?: "string" }
 *
 * Response:
 *   { "response": "string", "session_id": "string" }
 */
app.post('/chat', async (req, res) => {
    try {
        const { message, session_id } = req.body;

        if (!message || typeof message !== 'string') {
            res.status(400).json({ error: 'Missing or invalid "message" field' });
            return;
        }

        // Use provided session_id or create a new one
        const userId = 'user-1';
        let sessionId = session_id;

        if (!sessionId) {
            const session = await runner.sessionService.createSession({
                appName: 'openclaw',
                userId,
            });
            sessionId = session.id;
        }

        // Build user message content
        const userContent: Content = {
            role: 'user',
            parts: [{ text: message }],
        };

        // Run the agent and collect response
        let responseText = '';
        const turn = runner.runAsync({
            userId,
            sessionId,
            newMessage: userContent,
        });

        for await (const event of turn) {
            if (event.errorMessage) {
                responseText += `[API Error ${event.errorCode || ''}]: ${event.errorMessage}`;
            } else if (event.content?.parts) {
                for (const part of event.content.parts) {
                    if (part.text && event.content.role === 'model') {
                        responseText += part.text;
                    }
                }
            }
        }

        res.json({
            response: responseText || '(No response from agent)',
            session_id: sessionId,
        });
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('[Server] Error processing chat:', msg);
        res.status(500).json({ error: `Internal server error: ${msg}` });
    }
});

// Start the server
async function startServer() {
    const rootAgent = await initAgent();
    agentName = rootAgent.name;
    runner = new InMemoryRunner({ agent: rootAgent, appName: 'openclaw' });

    const PORT = parseInt(process.env.PORT || '3000', 10);
    app.listen(PORT, () => {
        console.log('╔═══════════════════════════════════════════════╗');
        console.log('║       🐾 OpenClaw Agent Server Started       ║');
        console.log('╠═══════════════════════════════════════════════╣');
        console.log(`║  URL:   http://localhost:${PORT}               ║`);
        console.log(`║  Model: ${(process.env.LLM_MODEL || 'litellm/deepseek/deepseek-chat').padEnd(37)}║`);
        console.log('║  Endpoints:                                   ║');
        console.log('║    POST /chat    — Chat with the agent        ║');
        console.log('║    GET  /health  — Health check               ║');
        console.log('╚═══════════════════════════════════════════════╝');
    });
}

startServer().catch(console.error);
