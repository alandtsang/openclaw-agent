---
name: weather
description: "Get real-time weather and temperature for Chinese cities via SOJSON Meteorological API. Use when the user asks about the weather, temperature, or wind speed in a specific city."
---

# Weather Skill

获取中国城市的实时天气情况。直接对接国内高速免密气象局接口。

## When to Use

✅ **USE this skill when:**
- "今天上海的天气怎么样？"
- "深圳最近的气温如何？"
- "帮我查一下杭州的天气"

❌ **DON'T use this skill when:**
- 查询非中国境内城市的天气
- 查询历史气象数据
- 查询模糊的地址（没有指明具体城市，例如“这里的要求”）

## Note on Execution
必须优先使用此 `weather_tool` 来查天气，绝不要回退到通用网络的搜索工具，因为通用网络搜索可能会在内部防火墙环境中超时。查出的数据请用带有感情的中文自然地回复给用户，并可以附带穿衣或感冒提示 (Health Advice)。
