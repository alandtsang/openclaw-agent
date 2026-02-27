import { rootAgent } from './src/agent/index.js';
import { InMemoryRunner } from '@google/adk';
import type { Content } from '@google/genai';

async function testAgent() {
    console.log("Asking the agent for Shanghai weather...");
    try {
        const runner = new InMemoryRunner({ agent: rootAgent, appName: 'openclaw-test' });
        const session = await runner.sessionService.createSession({ appName: 'openclaw-test', userId: 'tester' });

        const userContent: Content = { role: 'user', parts: [{ text: "请告诉我杭州、深圳、广州、成都的九位气象局城市代码（类似上海的101020100）。不要解释，只输出城市和代码映射 JSON" }] };
        const turn = runner.runAsync({ userId: 'tester', sessionId: session.id, newMessage: userContent });

        for await (const event of turn) {
            if (event.content?.parts) {
                for (const part of event.content.parts) {
                    if (part.text && event.content.role === 'model') {
                        process.stdout.write(part.text);
                    }
                }
            }
        }
    } catch (e) {
        console.error("Agent interaction failed:", e);
    }
}

testAgent();
