/**
 * Feishu (Lark) Webhook Notification Service
 *
 * Provides methods to send messages to Feishu group chats
 * via custom bot webhooks.
 */

import crypto from 'node:crypto';

export interface FeishuConfig {
    webhookUrl: string;
    secret?: string;
}

interface FeishuTextMessage {
    msg_type: 'text';
    content: { text: string };
    timestamp?: string;
    sign?: string;
}

interface FeishuRichTextMessage {
    msg_type: 'post';
    content: {
        post: {
            zh_cn: {
                title: string;
                content: unknown[][];
            };
        };
    };
    timestamp?: string;
    sign?: string;
}

interface FeishuCardMessage {
    msg_type: 'interactive';
    card: object;
    timestamp?: string;
    sign?: string;
}

type FeishuMessage = FeishuTextMessage | FeishuRichTextMessage | FeishuCardMessage;

export class FeishuService {
    private webhookUrl: string;
    private secret?: string;

    constructor(config: FeishuConfig) {
        this.webhookUrl = config.webhookUrl;
        this.secret = config.secret;
    }

    /**
     * Generate signature for webhook security verification
     */
    private generateSign(timestamp: string): string {
        if (!this.secret) return '';
        const stringToSign = `${timestamp}\n${this.secret}`;
        const hmac = crypto.createHmac('sha256', stringToSign);
        return hmac.update('').digest('base64');
    }

    /**
     * Add authentication fields to the message if secret is configured
     */
    private addAuth(message: FeishuMessage): FeishuMessage {
        if (this.secret) {
            const timestamp = Math.floor(Date.now() / 1000).toString();
            message.timestamp = timestamp;
            message.sign = this.generateSign(timestamp);
        }
        return message;
    }

    /**
     * Send a raw message payload to the Feishu webhook
     */
    private async send(message: FeishuMessage): Promise<{ success: boolean; error?: string }> {
        try {
            const payload = this.addAuth(message);
            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const result = (await response.json()) as { code?: number; msg?: string };

            if (result.code !== 0) {
                return { success: false, error: result.msg || 'Unknown Feishu API error' };
            }
            return { success: true };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return { success: false, error: `Failed to send Feishu notification: ${message}` };
        }
    }

    /**
     * Send a plain text message
     */
    async sendText(text: string): Promise<{ success: boolean; error?: string }> {
        return this.send({
            msg_type: 'text',
            content: { text },
        });
    }

    /**
     * Send a rich text (post) message
     *
     * @param title  - Message title
     * @param content - 2D array of content elements
     *
     * Example content:
     * [[{ tag: 'text', text: 'Hello ' }, { tag: 'a', text: 'World', href: 'https://example.com' }]]
     */
    async sendRichText(
        title: string,
        content: unknown[][],
    ): Promise<{ success: boolean; error?: string }> {
        return this.send({
            msg_type: 'post',
            content: {
                post: {
                    zh_cn: { title, content },
                },
            },
        });
    }

    /**
     * Send an interactive card message
     */
    async sendCard(card: object): Promise<{ success: boolean; error?: string }> {
        return this.send({
            msg_type: 'interactive',
            card,
        });
    }
}

/**
 * Create a FeishuService instance from environment variables
 */
export function createFeishuService(): FeishuService | null {
    const webhookUrl = process.env.FEISHU_WEBHOOK_URL;
    if (!webhookUrl) {
        console.warn('[FeishuService] FEISHU_WEBHOOK_URL not configured, Feishu notifications disabled.');
        return null;
    }

    return new FeishuService({
        webhookUrl,
        secret: process.env.FEISHU_WEBHOOK_SECRET || undefined,
    });
}
