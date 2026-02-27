/**
 * Tool to dynamically update the agent's memory state (MEMORY.md)
 */

import { FunctionTool } from '@google/adk';
import { z } from 'zod/v4';
import * as fs from 'node:fs';
import * as path from 'node:path';

const MEMORY_FILE_PATH = path.resolve(process.cwd(), 'MEMORY.md');

export const updateMemory = new FunctionTool({
    name: 'update_memory',
    description: 'Update the persistent memory file (MEMORY.md) to remember user preferences, facts, or instructions.',
    parameters: z.object({
        action: z.enum(['append', 'overwrite']).describe('Whether to append new information, or overwrite the whole memory file (use overwrite cautiously).'),
        content: z.string().describe('The content to write or append to the memory file. Should be formatted nicely in Markdown.'),
    }),
    execute: async ({ action, content }) => {
        try {
            if (!fs.existsSync(MEMORY_FILE_PATH)) {
                fs.writeFileSync(MEMORY_FILE_PATH, '# USER MEMORY AND PREFERENCES\n\n', 'utf-8');
            }

            if (action === 'overwrite') {
                fs.writeFileSync(MEMORY_FILE_PATH, content, 'utf-8');
                return 'Successfully overwrote MEMORY.md.';
            } else {
                fs.appendFileSync(MEMORY_FILE_PATH, `\n${content}\n`, 'utf-8');
                return 'Successfully appended new information to MEMORY.md.';
            }
        } catch (error) {
            return `Failed to update MEMORY.md: ${String(error)}`;
        }
    },
});
