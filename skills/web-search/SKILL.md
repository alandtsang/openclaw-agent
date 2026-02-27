---
name: web-search
description: "Searches the internet for information on a given query using DuckDuckGo. Returns search results with titles, snippets, and URLs. Use this tool when you need up-to-date information, news, or facts from the web."
---

# Web Search Skill

通用网络搜索引擎，使用 `duck-duck-scrape` 抓取 DuckDuckGo 网页结果。

## When to Use

✅ **USE this skill when:**
- "今天有什么重大新闻？"
- "2026年苹果公司发布了什么新产品？"
- 用户的提问超出你的知识截止日期时
- 需要确认实时的事实时

❌ **DON'T use this skill when:**
- 查询中国境内的天气情况（请使用专门的 `weather` skill）
- 询问简单的逻辑问题或编程题

## Note on Execution
如果因为由于网络请求频次过高或反爬虫规则导致返回 "Failed to execute search"，不要崩溃，应当向用户客观报告“当前搜索接口被限流或拦截”，并提供你能想到的替代建议。
