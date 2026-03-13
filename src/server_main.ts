/**
 * HTTP Server Entry Point
 *
 * Provides an Express HTTP server for cloud deployment.
 */

import 'dotenv/config';

// Robust polyfills for Node.js < 18
import * as webStreams from 'web-streams-polyfill';
Object.assign(globalThis, webStreams);

import 'node-fetch-native/polyfill';

import express from 'express';
import { InMemoryRunner } from '@google/adk';
import type { Content } from '@google/genai';
import { initAgent } from './agent/index.js';
import { HookExecutor } from './agent/hookExecutor.js';
import * as cronScheduler from './cron/index.js';
// @ts-ignore
import { createFeishuService } from '../skills/feishu/feishuService.js';
// @ts-ignore
import { createGeneratePptxTool } from '../skills/pptx/index.js';

const app = express();
app.use(express.json());

let runner: InMemoryRunner;
let hookExecutor: HookExecutor;
let agentName = '';

app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        agent: agentName,
        timestamp: new Date().toISOString(),
    });
});

app.post('/chat', async (req, res) => {
    try {
        const { message, session_id } = req.body;
        if (!message || typeof message !== 'string') {
            res.status(400).json({ error: 'Missing or invalid "message" field' });
            return;
        }

        const userId = 'user-1';
        let sessionId = session_id;

        if (!sessionId) {
            const session = await (runner as any).sessionService.createSession({
                appName: 'openclaw',
                userId,
            });
            sessionId = session.id;
        }

        const userContent: Content = {
            role: 'user',
            parts: [{ text: message }],
        };

        let responseText = '';
        const turn = runner.runAsync({
            userId,
            sessionId,
            newMessage: userContent,
        });

        for await (const event of turn) {
            if (event.errorMessage) {
                responseText += `[API Error]: ${event.errorMessage}`;
            } else if (event.content?.parts) {
                for (const part of event.content.parts) {
                    if (part.text && event.content.role === 'model') {
                        responseText += part.text;
                    }
                }
            }
        }

        await hookExecutor.executePostCompletionHooks(userId, sessionId).catch(err => {
            console.error('[HookExecutor] Failed to execute hooks:', err);
        });

        res.json({
            response: responseText || '(No response from agent)',
            session_id: sessionId,
        });
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('[Server] Error:', msg);
        res.status(500).json({ error: `Internal server error: ${msg}` });
    }
});

async function startServer() {
    const feishuService = createFeishuService();
    let defaultChatId = process.env.FEISHU_CRON_CHAT_ID || '';
    const pptxTool = createGeneratePptxTool(feishuService ?? undefined, () => defaultChatId);

    const { agent: rootAgent, hooks } = await initAgent([pptxTool]);
    agentName = rootAgent.name;
    runner = new InMemoryRunner({ agent: rootAgent as any, appName: 'openclaw' });
    hookExecutor = new HookExecutor(runner, hooks);

    const cronNotifyFn = feishuService?.client
        ? async (jobName: string, responseText: string) => {
            if (!defaultChatId) return;
            try {
                const text = `⏰ 定时任务「${jobName}」结果:\n\n${responseText.slice(0, 2000)}`;
                await feishuService.replyText(defaultChatId, text, 'chat_id');
            } catch (err) {
                console.warn('[CronScheduler] Notify error:', err);
            }
        }
        : undefined;
    cronScheduler.init(runner, cronNotifyFn);

    if (feishuService) {
        feishuService.startWsServer(async (event, replyFn) => {
            try {
                if (event.message?.chat_id) defaultChatId = event.message.chat_id;
                const contentObj = JSON.parse(event.message.content);
                if (!contentObj.text) return;

                const messageText = contentObj.text;
                const senderOpenId = event.sender?.sender_id?.open_id || 'unknown';
                const userId = `feishu-${senderOpenId}`;
                const sessionId = `session-${userId}`;

                try {
                    await (runner as any).sessionService.createSession({
                        appName: 'openclaw',
                        userId,
                        sessionId,
                    });
                } catch (e) {}

                let responseText = '';
                const turn = runner.runAsync({
                    userId,
                    sessionId,
                    newMessage: { role: 'user', parts: [{ text: messageText }] },
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

                await hookExecutor.executePostCompletionHooks(userId, sessionId).catch(console.error);
                if (responseText) await replyFn(responseText);
            } catch (err) {
                console.error('[Feishu WS] Error:', err);
            }
        }).catch(err => console.error('[Feishu WS] Failed:', err));
    }

    const PORT = parseInt(process.env.PORT || '3000', 10);
    app.listen(PORT, () => {
        console.log(`[Server] Started on port ${PORT}`);
    });
}

startServer().catch(console.error);
