# Session Logger

A skill for automatically saving conversation history to persistent session log files.

## When This Skill Activates

This skill activates when you:
- Say "保存对话信息" or "保存对话"
- Say "记录会话内容" or "保存session"
- Say "save session" or "save conversation"
- Ask to save the current conversation

## Evolution

- **隐式技能执行的记录**: 观察到 `create-pr` 技能在 `self-improving-agent` 完成对技能文件 (`SKILL.md`) 和内存文件 (`memory` 文件夹内的文件) 的修改后，会被隐式触发并执行。作为 `session-logger`，理解和记录这些系统级的、非用户直接调用的技能执行，对于积累完整的“经验知识”和掌握 agent 的自动化工作流至关重要。这有助于更全面地理解会话的上下文，而不仅仅局限于显式的用户指令。

- **自我进化周期的完成记录**: 进一步地，在 `self-improving-agent` 技能执行完毕后，标志着一个完整的自我进化周期的结束。这个周期包含了自我分析、文档/代码修改以及随后的 `create-pr` 操作。`session-logger` 记录这种**高层级的系统事件**，有助于描绘 Agent 持续学习和迭代能力的完整图景，为未来的分析和优化提供宝贵的上下文信息。
