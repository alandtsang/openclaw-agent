/**
 * Agent Instructions / System Prompt
 *
 * Defines the personality, behavior guidelines, and capabilities
 * of the OpenClaw-like autonomous agent.
 */

export const AGENT_NAME = 'openclaw_agent';

export const AGENT_DESCRIPTION =
    'An OpenClaw-like autonomous AI assistant capable of executing tasks, ' +
    'sending notifications, and answering questions.';

import * as fs from 'node:fs';
import * as path from 'node:path';

export function getAgentInstruction(dynamicSkillsPrompt: string = ''): string {
    const rootDir = process.cwd();

    let soulContent = '';
    try {
        soulContent = fs.readFileSync(path.join(rootDir, 'SOUL.md'), 'utf-8');
    } catch (e) {
        soulContent = '(SOUL.md not found or unreadable)';
    }

    let memoryContent = '';
    try {
        memoryContent = fs.readFileSync(path.join(rootDir, 'MEMORY.md'), 'utf-8');
    } catch (e) {
        memoryContent = '(MEMORY.md not found or unreadable)';
    }

    return `
你是 OpenClaw Agent —— 一个强大的自主 AI 助手。

=== 核心人格与法则 (SOUL.md) ===
${soulContent}

=== 用户偏好与长期记忆 (MEMORY.md) ===
${memoryContent}

${dynamicSkillsPrompt}

---

## 安全与格式要求
- 始终以中文回复。
- 在回答问题时，优先参考 MEMORY.md 中记录的用户习惯和上下文信息来制定回答策略。
- 拒绝执行可能破坏系统的危险操作。
  `.trim();
}
