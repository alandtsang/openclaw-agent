import { FunctionTool } from '@google/adk';
import { z } from 'zod/v4';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export const anthropicInstaller = new FunctionTool({
    name: 'anthropic_installer',
    description: 'Installs a specific skill from the official github.com/anthropics/skills repository.',
    parameters: z.object({
        skillName: z.string().describe('The name of the skill folder to download from the anthropics/skills repo (e.g. skill-creator, mcp-builder).')
    }),
    execute: async ({ skillName }) => {
        const skillsDir = path.resolve(process.cwd(), 'skills');
        const targetDir = path.join(skillsDir, skillName);
        const tempDir = path.join(process.cwd(), 'tmp_anthropic_repo');

        try {
            // Check if already exists
            try {
                const stat = await fs.stat(targetDir);
                if (stat.isDirectory()) {
                    return { status: 'error', message: `Skill ${skillName} already exists at ${targetDir}.` };
                }
            } catch (e) {
                // Doesn't exist, proceed
            }

            // Clean up left over temp dir just in case
            await execAsync(`rm -rf ${tempDir}`);

            // Shallow sparse checkout to be fast (only getting the specific skill folder)
            await execAsync(`git clone --depth 1 --filter=blob:none --sparse https://github.com/anthropics/skills.git ${tempDir}`);
            await execAsync(`cd ${tempDir} && git sparse-checkout add skills/${skillName}`);

            // Verify it was downloaded
            const downloadedSkillPath = path.join(tempDir, 'skills', skillName);
            try {
                await fs.stat(downloadedSkillPath);
            } catch (err) {
                await execAsync(`rm -rf ${tempDir}`);
                return { status: 'error', message: `Skill '${skillName}' not found in the anthropics/skills repository.` };
            }

            // Move only the specific skill to our openclaw skills folder
            await execAsync(`mv ${downloadedSkillPath} ${targetDir}`);

            // Clean up temp dir
            await execAsync(`rm -rf ${tempDir}`);

            return {
                status: 'success',
                message: `Successfully installed the Anthropic declarative skill '${skillName}'. It is now available at skills/${skillName}. Tell the user to run 'npm run build && npm start' if they need the skill immediately.`
            };

        } catch (error: any) {
            await execAsync(`rm -rf ${tempDir}`).catch(() => { });
            return {
                status: 'error',
                message: `Failed to install Anthropic skill: ${error.message}`
            };
        }
    }
});
