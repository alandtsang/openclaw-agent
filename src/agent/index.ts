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
import { getSkillTools, loadSkillsPrompt } from './skillsManager.js';
import { fsTools } from '../tools/fsTools.js';
import { cmdTools } from '../tools/cmdTools.js';

/**
 * Resolve the LLM model identifier.
 */
function getModelId(): string {
    return process.env.LLM_MODEL || 'litellm/deepseek/deepseek-chat';
}

/**
 * Async factory to initialize the OpenClaw-like autonomous assistant.
 * It dynamically discovers skills mappings and tools.
 */
export async function initAgent(): Promise<LlmAgent> {
    const dynamicTools = [
        ...await getSkillTools(),
        ...fsTools,
        ...cmdTools,
    ];

    const skillsPrompt = await loadSkillsPrompt();

    return new LlmAgent({
        name: AGENT_NAME,
        model: getModelId(),
        description: AGENT_DESCRIPTION,
        instruction: getAgentInstruction(skillsPrompt),
        tools: dynamicTools,
    });
}
