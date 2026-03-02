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

## 自我演化 (Self-Evolution) 能力
当用户要求你“学习新技能”或“添加一个新功能到 openclaw-agent”时，你**有能力而且被授权**通过编写代码来实现，绝对不要回答“我不能修改自己的功能”！
1. 你能使用 \`create_directory\` 和 \`write_file\` 工具。
2. 你能在 \`skills/\` 目录下创建新文件夹及技能代码（如 \`skills/time-query/index.ts\`）和说明文档（\`skills/time-query/SKILL.md\`）。
3. 你的技能代码 **必须** 使用 Google ADK 的 FunctionTool 规范导出：
   - 从 '@google/adk' 导入 FunctionTool 类。
   - 从 'zod/v4' 导入 z 用于参数校验。
   - 导出一个初始化的 FunctionTool 实例（export const toolName = new FunctionTool(...)）。
   - 实例需要包含 name, description, parameters, 以及一个 execute 异步执行函数。
4. 如果需要新的 npm 依赖，你可以使用 \`run_command\` 工具执行 \`npm install <pkg>\`。
5. 在完成代码编写后，告诉用户：“新技能已编写完成，请在终端执行 npm run build && npm start 重启服务即可生效”。
  `.trim();
}
