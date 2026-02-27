/**
 * Execute Command Tool
 *
 * Executes safe shell commands on the server.
 * Only whitelisted commands are allowed for security.
 */

import { FunctionTool } from '@google/adk';
import { execSync } from 'node:child_process';
import { z } from 'zod/v4';

/**
 * Whitelist of safe commands that the agent can execute.
 * Only the first token (command name) is checked.
 */
const ALLOWED_COMMANDS = new Set([
    'ls',
    'pwd',
    'date',
    'whoami',
    'uname',
    'uptime',
    'df',
    'free',
    'cat',
    'head',
    'tail',
    'wc',
    'echo',
    'hostname',
    'env',
    'which',
    'node',
    'npm',
    'npx',
]);

/**
 * Dangerous patterns that should be blocked regardless of command.
 */
const DANGEROUS_PATTERNS = [
    /rm\s/,
    /rmdir/,
    /mkfs/,
    /dd\s/,
    />\s*\/dev/,
    /chmod\s/,
    /chown\s/,
    /sudo/,
    /su\s/,
    /shutdown/,
    /reboot/,
    /kill/,
    /pkill/,
    /&&/,
    /\|\|/,
    /;\s/,
    /`/,
    /\$\(/,
];

function isCommandSafe(command: string): { safe: boolean; reason?: string } {
    const trimmed = command.trim();
    if (!trimmed) {
        return { safe: false, reason: 'Empty command' };
    }

    // Check dangerous patterns
    for (const pattern of DANGEROUS_PATTERNS) {
        if (pattern.test(trimmed)) {
            return { safe: false, reason: `Command contains dangerous pattern: ${pattern.source}` };
        }
    }

    // Extract base command name
    const baseCommand = trimmed.split(/\s+/)[0]?.replace(/^.*\//, '');
    if (!baseCommand || !ALLOWED_COMMANDS.has(baseCommand)) {
        return {
            safe: false,
            reason: `Command "${baseCommand}" is not in the allowed list. Allowed commands: ${[...ALLOWED_COMMANDS].join(', ')}`,
        };
    }

    return { safe: true };
}

export const executeCommand = new FunctionTool({
    name: 'execute_command',
    description:
        'Executes a safe shell command on the server. Only whitelisted commands are allowed (ls, pwd, date, whoami, uname, uptime, df, echo, hostname, node, npm, etc.). Dangerous commands and shell operators (&&, ||, ;, backticks) are blocked.',
    parameters: z.object({
        command: z.string().describe('The shell command to execute'),
    }),
    execute: ({ command }) => {
        const check = isCommandSafe(command);
        if (!check.safe) {
            return {
                status: 'error',
                error_message: `Command rejected: ${check.reason}`,
            };
        }

        try {
            const output = execSync(command, {
                timeout: 10_000, // 10 second timeout
                maxBuffer: 1024 * 1024, // 1MB max output
                encoding: 'utf-8',
                cwd: process.env.HOME || '/tmp',
            });
            return {
                status: 'success',
                command,
                output: output.trim(),
            };
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            return {
                status: 'error',
                command,
                error_message: `Command execution failed: ${msg}`,
            };
        }
    },
});
