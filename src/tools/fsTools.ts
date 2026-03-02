/**
 * File System Tools
 *
 * Provides the agent with the ability to read, write, and manage
 * local directories and files.
 */

import { FunctionTool } from '@google/adk';
import { z } from 'zod/v4';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const rootDir = process.cwd();

export const write_file_tool = new FunctionTool({
    name: 'write_file',
    description: 'Writes the provided content to a file at the given relative path. If the file exists, it will be overwritten. Use this to create new skills, configure files, or rewrite code.',
    parameters: z.object({
        filepath: z.string().describe('Relative path from project root (e.g., skills/time-query/index.ts)'),
        content: z.string().describe('The complete file content to write'),
    }),
    execute: async ({ filepath, content }) => {
        try {
            const absolutePath = path.resolve(rootDir, filepath);

            // Ensure path is within the project root for safety
            if (!absolutePath.startsWith(rootDir)) {
                return { status: 'error', message: 'Cannot write files outside the project root.' };
            }

            // Ensure directory exists
            await fs.mkdir(path.dirname(absolutePath), { recursive: true });

            await fs.writeFile(absolutePath, content, 'utf-8');
            return { status: 'success', message: `Successfully wrote to ${filepath}` };
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            return { status: 'error', message: `Failed to write file: ${msg}` };
        }
    }
});

export const create_directory_tool = new FunctionTool({
    name: 'create_directory',
    description: 'Creates a new directory at the specified relative path. Parents will be created automatically.',
    parameters: z.object({
        dirpath: z.string().describe('Relative path from project root (e.g., skills/time-query)'),
    }),
    execute: async ({ dirpath }) => {
        try {
            const absolutePath = path.resolve(rootDir, dirpath);
            if (!absolutePath.startsWith(rootDir)) {
                return { status: 'error', message: 'Cannot create directories outside the project root.' };
            }

            await fs.mkdir(absolutePath, { recursive: true });
            return { status: 'success', message: `Directory created: ${dirpath}` };
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            return { status: 'error', message: `Failed to create directory: ${msg}` };
        }
    }
});

export const fsTools = [write_file_tool, create_directory_tool];
