/**
 * OpenClaw Agent Definition
 *
 * Main agent configuration using Google ADK.
 * Exports the rootAgent for use by the server and CLI.
 */

import 'dotenv/config';
import { LlmAgent } from '@google/adk';
import {
    AGENT_NAME,
    AGENT_DESCRIPTION,
    getAgentInstruction,
} from './instructions.js';
import {
    getCurrentTime,
    executeCommand,
    sendFeishuNotification,
    webSearch,
    updateMemory,
} from '../tools/index.js';

/**
 * Resolve the LLM model identifier.
 * Supports:
 *   - Gemini models (native): "gemini-2.5-flash"
 *   - Third-party via LiteLLM: "litellm/deepseek/deepseek-chat"
 */
function getModelId(): string {
    return process.env.LLM_MODEL || 'litellm/deepseek/deepseek-chat';
}

/**
 * The root agent — an OpenClaw-like autonomous assistant.
 */
export const rootAgent = new LlmAgent({
    name: AGENT_NAME,
    model: getModelId(),
    description: AGENT_DESCRIPTION,
    instruction: getAgentInstruction(),
    tools: [
        getCurrentTime,
        executeCommand,
        sendFeishuNotification,
        webSearch,
        updateMemory,
    ],
});
