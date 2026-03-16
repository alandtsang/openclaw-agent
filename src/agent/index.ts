/**
 * OpenClaw Agent Definition
 *
 * Main agent configuration using Google ADK.
 * Exports the rootAgent for use by the server and CLI.
 */

import 'dotenv/config';
import 'node-fetch-native/polyfill';
import { LlmAgent } from '@google/adk';
import { HttpsProxyAgent } from 'https-proxy-agent';

// Setup proxy if configured
const proxy = process.env.LLM_PROXY || process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
if (proxy) {
    const originalFetch = (global as any).fetch;
    if (originalFetch) {
        console.log(`[Proxy] Intercepting global fetch to use proxy: ${proxy}`);
        const agent = new HttpsProxyAgent(proxy);
        (global as any).fetch = (url: any, opts: any) => {
            let finalUrl = url;
            const baseUrl = process.env.LLM_BASE_URL;

            // Handle Base URL replacement for Gemini
            if (baseUrl && typeof url === 'string' && url.includes('generativelanguage.googleapis.com')) {
                finalUrl = url.replace('https://generativelanguage.googleapis.com', baseUrl.trim().replace(/\/$/, ''));
                console.log(`[BaseURL] Redirecting Gemini call: ${url} -> ${finalUrl}`);
            }

            console.log(`[Proxy Interceptor] Fetching: ${finalUrl} (Proxy: ${proxy})`);
            return originalFetch(finalUrl, { ...opts, agent });
        };
    } else {
        console.warn('[Proxy] global.fetch not found, proxy might not be applied correctly.');
    }
}

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
