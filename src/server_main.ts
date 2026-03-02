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
// @ts-ignore: Ignore rootDir issue since this file is conditionally loaded
import { createFeishuService } from '../skills/feishu/feishuService.js';

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

    // Start Feishu WS Server
    const feishuService = createFeishuService();
    if (feishuService) {
        feishuService.startWsServer(async (event, replyFn) => {
            try {
                console.log('\n[Feishu WS] Received full event:', JSON.stringify(event, null, 2));
                const contentObj = JSON.parse(event.message.content);
                // Currently only handling text messages in WS
                if (!contentObj.text) return;

                const messageText = contentObj.text;
                // Use open_id as user identifier
                const senderOpenId = event.sender?.sender_id?.open_id || 'unknown';
                const userId = `feishu-${senderOpenId}`;
                const sessionId = `session-${userId}`;

                const userContent: Content = {
                    role: 'user',
                    parts: [{ text: messageText }],
                };

                let responseText = '';

                // Ensure session exists
                try {
                    const existingSession = await runner.sessionService.getSession({
                        appName: 'openclaw',
                        userId,
                        sessionId
                    });
                    if (!existingSession) {
                        await runner.sessionService.createSession({
                            appName: 'openclaw',
                            userId,
                            sessionId,
                        });
                    }
                } catch (e) {
                    // Fallback create if getSession actually throws
                    await runner.sessionService.createSession({
                        appName: 'openclaw',
                        userId,
                        sessionId,
                    });
                }

                const turn = runner.runAsync({
                    userId,
                    sessionId,
                    newMessage: userContent,
                });

                for await (const chunk of turn) {
                    if (chunk.errorMessage) {
                        responseText += `[API Error]: ${chunk.errorMessage}\\n`;
                    } else if (chunk.content?.parts) {
                        for (const part of chunk.content.parts) {
                            if (part.text && chunk.content.role === 'model') {
                                responseText += part.text;
                            }
                        }
                    }
                }

                if (responseText) {
                    await replyFn(responseText);
                }
            } catch (err) {
                console.error('[Feishu WS] Error processing message:', err);
            }
        }).catch(err => console.error('[Feishu WS] Failed to start:', err));
    }

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
