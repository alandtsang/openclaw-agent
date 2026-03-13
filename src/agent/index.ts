/**
 * OpenClaw Agent Definition
 *
 * Main agent configuration using Google ADK.
 * Exports the rootAgent for use by the server and CLI.
 */

import 'dotenv/config';
import 'node-fetch-native/polyfill';
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
    return process.env.LLM_MODEL || 'gemini-1.5-flash';
}

/**
 * Async factory to initialize the OpenClaw-like autonomous assistant.
 * It dynamically discovers skills mappings and tools.
 * @param extraTools Optional list of ADK tools to inject, overriding any skill tool with the same name.
 */
export async function initAgent(extraTools?: any[]): Promise<{ agent: LlmAgent; hooks: any[] }> {
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

    const instruction = getAgentInstruction(skillsPrompt.prompt);
    const model = getModelId();

    const agent = new LlmAgent({
        name: AGENT_NAME,
        model: model,
        description: AGENT_DESCRIPTION,
        instruction: instruction,
        tools: dynamicTools,
    });
    
    return {
        agent,
        hooks: skillsPrompt.hooks
    };
}
