/**
 * Get Current Time Tool
 *
 * Returns the current date and time in a specified timezone.
 */

import { FunctionTool } from '@google/adk';
import { z } from 'zod/v4';

export const getCurrentTime = new FunctionTool({
    name: 'get_current_time',
    description:
        'Returns the current date and time. Optionally specify a timezone identifier (e.g., Asia/Shanghai, America/New_York). Defaults to Asia/Shanghai.',
    parameters: z.object({
        timezone: z
            .string()
            .optional()
            .default('Asia/Shanghai')
            .describe('IANA timezone identifier, e.g. Asia/Shanghai, America/New_York, Europe/London'),
    }),
    execute: ({ timezone }) => {
        const tz = timezone || 'Asia/Shanghai';
        try {
            const now = new Date();
            const formatted = now.toLocaleString('zh-CN', {
                timeZone: tz,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                weekday: 'long',
                hour12: false,
            });
            return {
                status: 'success',
                timezone: tz,
                datetime: formatted,
                iso: now.toISOString(),
            };
        } catch {
            return {
                status: 'error',
                error_message: `Invalid timezone identifier: "${tz}". Please use IANA format like Asia/Shanghai.`,
            };
        }
    },
});
