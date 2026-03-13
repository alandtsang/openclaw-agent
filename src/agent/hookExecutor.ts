import { InMemoryRunner } from '@google/adk';
import type { Content } from '@google/genai';

export interface HookTrigger {
    trigger: string;
    mode: 'auto' | 'ask_first' | 'background';
    context?: string;
    condition?: string;
    reason?: string;
}

export interface SkillHooks {
    skill: string;
    hooks: {
        before_start?: HookTrigger[];
        after_complete?: HookTrigger[];
        on_error?: HookTrigger[];
    };
}

/**
 * HookExecutor
 * Handles triggering "Self-Improving" logic and other skill-defined hooks.
 */
export class HookExecutor {
    constructor(
        private runner: InMemoryRunner,
        private allHooks: SkillHooks[]
    ) {
        console.log(`[HookExecutor] Initialized with ${allHooks.length} skill hooks:`, allHooks.map(h => h.skill));
    }

    /**
     * Executes after_complete hooks for a session.
     */
    async executePostCompletionHooks(userId: string, sessionId: string) {
        // Universal self-improvement: if self-improving-agent is installed, trigger it.
        const hasSelfImprovingAgent = this.allHooks.some(h => h.skill === 'self-improving-agent');
        
        if (hasSelfImprovingAgent) {
            console.log(`[HookExecutor] Universally triggering self-improving-agent for evolution...`);
            const evolutionPrompt = `[系统指令] 任务已执行完毕。请现在的你作为「self-improving-agent」来执行自我进化分析。
任务目标：分析本次对话中的经验教训，识别可复用的模式或需要修正的规则。
如果发现有价值的改进：
1. 更新对应的 SKILL.md 文件（增加 evolution 标记）。
2. 在 skills/self-improving-agent/memory/ 记录模式或情景记忆。
3. 如果修改了代码或技能，请告知用户。`;
            await this.runInternalTask(userId, sessionId, evolutionPrompt);
        }

        for (const skillEntry of this.allHooks) {
            const hooks = skillEntry.hooks.after_complete;
            if (!hooks) continue;

            for (const hook of hooks) {
                if (hook.mode === 'auto' || hook.mode === 'background') {
                    console.log(`[HookExecutor] Auto-triggering hook: ${hook.trigger} for skill: ${skillEntry.skill}`);
                    
                    const hookPrompt = `[系统指令] 技能「${skillEntry.skill}」已执行完毕。请现在的你作为「${hook.trigger}」来执行后续操作。
上下文提示：${hook.context || '无'}
任务目标：分析刚才的对话并积累经验知识。如果发现可以沉淀的模式，请更新对应的 SKILL.md 文件或 memory 文件夹。`;

                    await this.runInternalTask(userId, sessionId, hookPrompt);
                }
            }
        }
    }

    /**
     * Internal helper to run a silent agent turn.
     */
    private async runInternalTask(userId: string, sessionId: string, prompt: string) {
        const userContent: Content = {
            role: 'user',
            parts: [{ text: prompt }],
        };

        const turn = this.runner.runAsync({
            userId,
            sessionId,
            newMessage: userContent,
        });

        // We consume the stream but don't output it to the user.
        for await (const chunk of turn) {
            if (chunk.errorMessage) {
                console.error(`[HookExecutor] Error: ${chunk.errorMessage}`);
            }
            // Logic results are persisted via file tools (SKILL.md, memory/)
        }
    }
}
