import fs from 'node:fs';
import path from 'node:path';
import { url } from 'node:inspector';
import yaml from 'yaml';

// Adjust the root path correctly based on execution context (dist vs src)
const __dirname = path.dirname(new URL(import.meta.url).pathname);
// Whether we are running via tsx from src/ or compiled from dist/, we navigate to the root folder
const rootDir = path.resolve(__dirname, '../../');
const skillsDir = path.join(rootDir, 'skills');

/**
 * Parses frontmatter from a markdown string.
 * Assumes format starts with `---` on the first line.
 */
function parseFrontmatter(markdown: string): { data: any; content: string } {
    const match = /^(---[\s\S]+?---)([\s\S]*)$/.exec(markdown);
    if (!match) {
        return { data: {}, content: markdown };
    }

    // Removing the leading and trailing `---`
    const frontmatterRaw = match[1].replace(/^---/, '').replace(/---$/, '').trim();
    const content = match[2].trim();

    let data = {};
    try {
        data = yaml.parse(frontmatterRaw);
    } catch (e) {
        console.warn('Failed to parse YAML frontmatter:', e);
    }

    return { data, content };
}

export async function loadSkillsPrompt(): Promise<string> {
    let promptChunk = '\n\n# 可用技能指令 (Available Skills)\n\n你可以使用以下技能来协助用户。以下是自动装载的技能列表与使用指南：\n';
    try {
        if (!fs.existsSync(skillsDir)) return '';

        const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory() && !entry.name.startsWith('.')) {
                const skillMdPath = path.join(skillsDir, entry.name, 'SKILL.md');
                if (fs.existsSync(skillMdPath)) {
                    let rawContent = fs.readFileSync(skillMdPath, 'utf-8');
                    const { data, content } = parseFrontmatter(rawContent);

                    const skillName = data.name || entry.name;
                    const skillDesc = data.description ? `> **Description**: ${data.description}\n` : '';

                    promptChunk += `\n--- [Skill: ${skillName}] ---\n${skillDesc}\n${content}\n`;
                }
            }
        }
    } catch (e) {
        console.error("[SkillsManager] Failed to load SKILL.md prompts:", e);
    }

    return promptChunk;
}

export async function getSkillTools(): Promise<any[]> {
    const tools: any[] = [];
    try {
        if (!fs.existsSync(skillsDir)) return tools;

        const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory() && !entry.name.startsWith('.')) {
                const modulePath = path.join(skillsDir, entry.name, 'index.js');
                const tsModulePath = path.join(skillsDir, entry.name, 'index.ts');

                const hasTs = fs.existsSync(tsModulePath);
                const hasJs = fs.existsSync(modulePath);

                let compiledSkillModule = '';
                if (__dirname.includes('dist')) {
                    compiledSkillModule = path.join(__dirname, '../../skills', entry.name, 'index.js');
                }

                const hasCompiledJs = compiledSkillModule && fs.existsSync(compiledSkillModule);

                // If no executing index file exists, it's a "Prompt-only" Declarative Skill. We just skip loading tools.
                if (!hasTs && !hasJs && !hasCompiledJs) {
                    continue;
                }

                // For dynamic imports during runtime, we import the exact code location.
                let targetImport = '';

                if (__dirname.includes('dist')) {
                    // Running collected js from dist/src/agent
                    // Skills are compiled to dist/skills/<name>/index.js
                    targetImport = `file://${compiledSkillModule}`;
                } else {
                    // Running via tsx locally from src/agent
                    targetImport = hasTs ? `file://${tsModulePath}` : `file://${modulePath}`;
                }

                try {
                    const skillModule = await import(targetImport);
                    // Standardize: The module MUST export an object containing the adk FunctionTool
                    // e.g. export const weatherTool = new FunctionTool(...)
                    // We extract all exported FunctionTools dynamically.
                    for (const key of Object.keys(skillModule)) {
                        if (skillModule[key] && typeof skillModule[key] === 'object' && skillModule[key].name) {
                            tools.push(skillModule[key]);
                        }
                    }
                } catch (err) {
                    console.error(`[SkillsManager] Failed to mount tool for skill ${entry.name} from ${targetImport}:`, err);
                }
            }
        }
    } catch (e) {
        console.error("[SkillsManager] Failed to load skill modules:", e);
    }
    return tools;
}
