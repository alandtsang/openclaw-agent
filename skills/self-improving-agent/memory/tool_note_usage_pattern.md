# Tool Output Note Field Usage Pattern

## Description
This pattern describes the successful utilization of the `note` field often present in the output of certain tools. This field provides explicit instructions or guidance on how the Agent should formulate its response to the user based on the tool's result, including suggested language, tone, and information to prioritize.

## Context
During a user interaction where the `weather_tool` was invoked for a weather query, the tool's output contained a `note` field: `"请用中文并带有感情地将查到的气温、天气状况和空气质量汇报给用户，并可以附上返回的 health_advice (感冒/健康指引)。"`. The Agent successfully interpreted and applied these instructions, leading to a well-formatted, polite, and comprehensive user response.

## Reusable Pattern
When a tool's output includes a `note` field with instructions for user response generation, the Agent should:
1.  **Prioritize**: Treat the `note` field as a high-priority directive for response formatting.
2.  **Integrate**: Weave the suggested elements (e.g., specific data points, emotional tone, language) into the final user-facing message.
3.  **Enhance User Experience**: Leverage these notes to make responses more natural, helpful, and aligned with user expectations for specific tool interactions.

## Lessons Learned
- Tool developers can significantly improve Agent performance and user satisfaction by including explicit `note` fields in their tool outputs, guiding the Agent on how to best present information.
- The Agent demonstrates effective parsing and application of these directives, showcasing its ability to follow nuanced instructions embedded in tool results.