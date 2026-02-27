import { initAgent } from './src/agent/index.js';
import { InMemoryRunner } from '@google/adk';
import type { Content } from '@google/genai';

async function testDynamicSkills() {
    console.log("Initializing dynamic agent...");
    try {
        const rootAgent = await initAgent();
        console.log(`Agent loaded with ${rootAgent.tools?.length || 0} tools.`);
        if (rootAgent.tools?.length === 0) {
            throw new Error("No tools were loaded dynamically!");
        }

        const runner = new InMemoryRunner({ agent: rootAgent, appName: 'openclaw-test' });
        const session = await runner.sessionService.createSession({ appName: 'openclaw-test', userId: 'tester' });

        const userContent: Content = { role: 'user', parts: [{ text: "今天上海的天气如何" }] };
        const turn = runner.runAsync({ userId: 'tester', sessionId: session.id, newMessage: userContent });

        process.stdout.write("Agent: ");
        for await (const event of turn) {
            if (event.content?.parts) {
                for (const part of event.content.parts) {
                    if (part.text && event.content.role === 'model') {
                        process.stdout.write(part.text);
                    }
                }
            }
        }
        console.log("\nDone!");
    } catch (e) {
        console.error("Agent interaction failed:", e);
    }
}

testDynamicSkills();
