---
name: feishu
description: "Send results, notifications, and updates to a Feishu (Lark) group chat via webhook. Use this when the user asks to send the AI's result or a message to Feishu."
---

# Feishu Notification Skill

在飞书（Lark）中发送消息、通知和结果。

## When to Use

✅ **USE this skill when:**
- 用户要求：“将 Agent 的结果发送到飞书”
- 用户要求：“把这条消息推送到飞书群”
- 需要通过飞书 Webhook 报警或通知时。

❌ **DON'T use this skill when:**
- 用户没有提及需要发飞书。
- 通用总结的回答不需要对外推送。

## How to Formulate Messages

- 通过 title 参数可以发送富文本块。
- content 中可以包含需要报告的详细信息。
