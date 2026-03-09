/**
 * CLI Entry Point
 *
 * Interactive command-line interface for chatting with the agent.
 * Useful for local development and debugging.
 */

import 'dotenv/config';
import * as readline from 'node:readline';
import { InMemoryRunner } from '@google/adk';
import type { Content } from '@google/genai';
import { initAgent } from './agent/index.js';
import * as cronScheduler from './cron/index.js';

async function main() {
    console.log('╔═══════════════════════════════════════════════╗');
    console.log('║        🐾 OpenClaw Agent CLI Mode            ║');
    console.log('╠═══════════════════════════════════════════════╣');
    console.log('║  Type your message and press Enter to chat.  ║');
    console.log('║  Type "exit" or "quit" to leave.             ║');
    console.log(`║  Model: ${(process.env.LLM_MODEL || 'litellm/deepseek/deepseek-chat').padEnd(37)}║`);
    console.log('╚═══════════════════════════════════════════════╝');
    console.log();

    // Create runner and session
    const rootAgent = await initAgent();
    const runner = new InMemoryRunner({ agent: rootAgent, appName: 'openclaw' });

    // Initialize cron scheduler
    cronScheduler.init(runner);

    const userId = 'cli-user';
    const session = await runner.sessionService.createSession({
        appName: 'openclaw',
        userId,
    });

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    const prompt = () => {
        rl.question('🧑 You: ', async (input) => {
            const trimmed = input.trim();

            if (!trimmed) {
                prompt();
                return;
            }

            if (trimmed.toLowerCase() === 'exit' || trimmed.toLowerCase() === 'quit') {
                console.log('\n👋 Goodbye!');
                rl.close();
                process.exit(0);
            }

            try {
                const userContent: Content = {
                    role: 'user',
                    parts: [{ text: trimmed }],
                };

                let responseText = '';
                const turn = runner.runAsync({
                    userId,
                    sessionId: session.id,
                    newMessage: userContent,
                });

                process.stdout.write('🤖 Agent: ');

                for await (const event of turn) {
                    if (event.errorMessage) {
                        const errMsg = `[API Error ${event.errorCode || ''}]: ${event.errorMessage}`;
                        process.stdout.write(errMsg);
                        responseText += errMsg;
                    } else if (event.content?.parts) {
                        for (const part of event.content.parts) {
                            if (part.text && event.content.role === 'model') {
                                process.stdout.write(part.text);
                                responseText += part.text;
                            }
                        }
                    }
                }

                if (!responseText) {
                    console.log('(No response)');
                } else {
                    console.log(); // newline after streaming
                }
            } catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                console.error(`\n❌ Error: ${msg}`);
            }

            console.log();
            prompt();
        });
    };

    prompt();
}

main().catch(console.error);
