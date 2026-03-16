---
name: weather
description: "查询任意城市的当前天气和多日预报。支持中文城市名。数据来自 Open-Meteo（免费、无需 API Key、国内可直连）。用户询问天气、气温、下雨、预报时使用。"
metadata: { "openclaw": { "emoji": "☔" } }
---

# Weather Skill

使用 `get_weather` 工具查询天气。支持以下 type 值：

- `current` — 当前天气一行摘要（默认）
- `today` — 今天详细天气
- `tomorrow` — 明天天气
- `forecast3d` — 3 天预报图
- `forecast7d` — 7 天扩展预报
