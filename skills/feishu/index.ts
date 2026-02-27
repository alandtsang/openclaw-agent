/**
 * Send Feishu Notification Tool
 *
 * Allows the agent to send messages to Feishu group chats
 * via webhook integration.
 */

import { FunctionTool } from '@google/adk';
import { z } from 'zod/v4';
import { createFeishuService } from './feishuService.js';

// Lazily initialize the Feishu service
let feishuService: ReturnType<typeof createFeishuService> | undefined;

function getFeishuService() {
    if (feishuService === undefined) {
        feishuService = createFeishuService();
    }
    return feishuService;
}

export const sendFeishuNotification = new FunctionTool({
    name: 'send_feishu_notification',
    description:
        'Sends a notification message to a Feishu (Lark) group chat via webhook. ' +
        'Supports plain text and rich text messages. Use this tool when the user asks to ' +
        'send a notification, alert to Feishu, or send the result to Feishu.',
    parameters: z.object({
        message: z.string().describe('The message content to send'),
        title: z
            .string()
            .optional()
            .describe(
                'Optional title for rich text messages. If provided, the message will be sent as rich text with this title.',
            ),
    }),
    execute: async ({ message, title }) => {
        const service = getFeishuService();
        if (!service) {
            return {
                status: 'error',
                error_message:
                    'Feishu webhook is not configured. Please set FEISHU_WEBHOOK_URL in the .env file.',
            };
        }

        try {
            let result;
            if (title) {
                // Send as rich text with title
                result = await service.sendRichText(title, [
                    [{ tag: 'text', text: message }],
                ]);
            } else {
                // Send as plain text
                result = await service.sendText(message);
            }

            if (result.success) {
                return {
                    status: 'success',
                    message: 'Notification sent to Feishu successfully.',
                };
            } else {
                return {
                    status: 'error',
                    error_message: result.error || 'Failed to send Feishu notification.',
                };
            }
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            return {
                status: 'error',
                error_message: `Failed to send Feishu notification: ${msg}`,
            };
        }
    },
});
