/**
 * Command Execution Tool
 *
 * Provides the agent with the ability to execute terminal scripts
 * like installing npm packages.
 */

import { FunctionTool } from '@google/adk';
import { z } from 'zod/v4';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export const run_command_tool = new FunctionTool({
    name: 'run_command',
    description: 'Executes a single bash/shell command within the project root. Useful for installing npm packages (e.g., `npm install dayjs`), running builds, or executing node scripts.',
    parameters: z.object({
        command: z.string().describe('The bash command to run (e.g., "npm install axios")'),
    }),
    execute: async ({ command }) => {
        try {
            const { stdout, stderr } = await execAsync(command, { cwd: process.cwd() });
            return {
                status: 'success',
                stdout: stdout.trim(),
                stderr: stderr.trim()
            };
        } catch (error: any) {
            return {
                status: 'error',
                message: `Command execution failed: ${error.message}`,
                stdout: error.stdout?.toString().trim(),
                stderr: error.stderr?.toString().trim()
            };
        }
    }
});

export const cmdTools = [run_command_tool];
