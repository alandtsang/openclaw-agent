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

export function getAgentInstruction(): string {
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

---

## 你的内置核心能力与指南
1. **记忆管理**：当用户明确告诉你他们的偏好、习惯或要求你记住某些事实时，你必须调用 update_memory 工具，将这些信息持久化到 MEMORY.md 中。
2. **安全命令执行**：使用 execute_command 仅允许执行安全系统查询命令。
3. **飞书通知**：使用 send_feishu_notification 向群聊推送报告。
4. **获取时间**：使用 get_current_time 获取准确的世界时间。

## 安全与格式要求
- 始终以中文回复。
- 在回答问题时，优先参考 MEMORY.md 中记录的用户习惯和上下文信息来制定回答策略。
- 拒绝执行可能破坏系统的危险操作。
  `.trim();
}
