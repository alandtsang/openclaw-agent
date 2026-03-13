#!/usr/bin/env tsx

/**
 * OpenClaw Agent CLI
 * 
 * An interactive command-line interface for the autonomous agent.
 */

import 'dotenv/config';

// Robust polyfills for Node.js < 18
import * as webStreams from 'web-streams-polyfill';
Object.assign(globalThis, webStreams);

import 'node-fetch-native/polyfill';

import * as readline from 'node:readline';
import { InMemoryRunner } from '@google/adk';
import { initAgent } from './agent/index.js';
import { HookExecutor } from './agent/hookExecutor.js';

async function main() {
    console.log('\x1b[36m%s\x1b[0m', '╔═══════════════════════════════════════════════╗');
    console.log('\x1b[36m%s\x1b[0m', '║        🐾 OpenClaw Agent CLI Mode            ║');
    console.log('\x1b[36m%s\x1b[0m', '╠═══════════════════════════════════════════════╣');
    console.log('\x1b[36m%s\x1b[0m', '║  Type your message and press Enter to chat.  ║');
    console.log('\x1b[36m%s\x1b[0m', '║  Type "exit" or "quit" to leave.             ║');
    console.log('\x1b[36m%s\x1b[0m', `║  Model: ${process.env.LLM_MODEL || 'default'}              ║`);
    console.log('\x1b[36m%s\x1b[0m', '╚═══════════════════════════════════════════════╝');

    const { agent, hooks } = await initAgent();
    const runner = new InMemoryRunner({ agent: agent as any });
    const hookExecutor = new HookExecutor(runner, hooks);
    const userId = 'alandtsang';

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: '\n🧑 \x1b[32mYou:\x1b[0m  ',
    });

    rl.prompt();

    rl.on('line', async (line) => {
        const input = line.trim();
        if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
            process.exit(0);
        }

        if (!input) {
            rl.prompt();
            return;
        }

        try {
            const session = await (runner as any).sessionService.createSession();
            const turn = runner.runAsync({
                userId,
                sessionId: session.id,
                newMessage: { role: 'user', parts: [{ text: input }] },
            });

            process.stdout.write('\n🤖 \x1b[35mAgent:\x1b[0m ');
            
            for await (const event of turn) {
                if (event.author === agent.name && event.content) {
                    const parts = event.content.parts || [];
                    for (const part of parts) {
                        if ('text' in part && part.text) {
                            process.stdout.write(part.text);
                        }
                    }
                } else if (event.errorMessage) {
                    process.stdout.write(`\n[API Error]: ${event.errorMessage}`);
                }
            }
            console.log('\n');
            
            await hookExecutor.executePostCompletionHooks(userId, session.id);
            
        } catch (error: any) {
            console.error('\n\x1b[31m[Error]:\x1b[0m', error.message || error);
        }

        rl.prompt();
    });
}

main().catch(console.error);
