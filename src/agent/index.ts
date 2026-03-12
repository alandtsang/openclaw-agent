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
import { fsTools, cmdTools, updateMemory, anthropicInstaller, cronTools } from '../tools/index.js';

/**
 * Resolve the LLM model identifier.
 */
function getModelId(): string {
    return process.env.LLM_MODEL || 'litellm/deepseek/deepseek-chat';
}

/**
 * Async factory to initialize the OpenClaw-like autonomous assistant.
 * It dynamically discovers skills mappings and tools.
 * @param extraTools Optional list of ADK tools to inject, overriding any skill tool with the same name.
 */
export async function initAgent(extraTools?: any[]): Promise<LlmAgent> {
    const skillTools = await getSkillTools();

    // Override any skill tools with injected ones (matched by name)
    const overrideNames = new Set((extraTools || []).map(t => t.name));
    const filteredSkillTools = skillTools.filter(t => !overrideNames.has(t.name));

    const dynamicTools = [
        ...filteredSkillTools,
        ...(extraTools || []),
        ...fsTools,
        ...cmdTools,
        ...cronTools,
        updateMemory,
        anthropicInstaller,
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
