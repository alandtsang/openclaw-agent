/**
 * Feishu (Lark) Webhook and WebSocket Notification Service
 *
 * Provides methods to send messages to Feishu group chats
 * via custom bot webhooks, and listen to incoming messages
 * via WebSocket (Persistent Connection).
 */

import crypto from 'node:crypto';
import * as lark from '@larksuiteoapi/node-sdk';

export interface FeishuConfig {
    webhookUrl?: string;
    secret?: string;
    appId?: string;
    appSecret?: string;
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
    private webhookUrl?: string;
    private webhookSecret?: string;
    public client?: lark.Client;

    constructor(config: FeishuConfig) {
        this.webhookUrl = config.webhookUrl;
        this.webhookSecret = config.secret;

        if (config.appId && config.appSecret) {
            this.client = new lark.Client({
                appId: config.appId,
                appSecret: config.appSecret,
                disableTokenCache: false,
            });
        }
    }

    /**
     * Generate signature for webhook security verification
     */
    private generateSign(timestamp: string): string {
        if (!this.webhookSecret) return '';
        const stringToSign = `${timestamp}\n${this.webhookSecret}`;
        const hmac = crypto.createHmac('sha256', stringToSign);
        return hmac.update('').digest('base64');
    }

    /**
     * Add authentication fields to the message if secret is configured
     */
    private addAuth(message: FeishuMessage): FeishuMessage {
        if (this.webhookSecret) {
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
        if (!this.webhookUrl) {
            return { success: false, error: 'Webhook URL not configured.' };
        }
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
            const msg = error instanceof Error ? error.message : String(error);
            return { success: false, error: `Failed to send Feishu notification: ${msg}` };
        }
    }

    /**
     * Send a plain text message via Webhook
     */
    async sendText(text: string): Promise<{ success: boolean; error?: string }> {
        return this.send({
            msg_type: 'text',
            content: { text },
        });
    }

    /**
     * Send a rich text (post) message via Webhook
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
     * Send a plain text message via Official SDK (requires appId and appSecret)
     */
    async replyText(receiveId: string, text: string, receiveIdType: 'open_id' | 'user_id' | 'union_id' | 'email' | 'chat_id' = 'open_id'): Promise<{ success: boolean; error?: string }> {
        if (!this.client) {
            return { success: false, error: 'Feishu Client not initialized (missing appId/appSecret).' };
        }
        try {
            await this.client.im.message.create({
                params: {
                    receive_id_type: receiveIdType,
                },
                data: {
                    receive_id: receiveId,
                    content: JSON.stringify({ text }),
                    msg_type: 'text',
                }
            });
            return { success: true };
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            return { success: false, error: `Failed to send SDK message: ${msg}` };
        }
    }

    /**
     * Upload a file and send it as a file message to a chat
     * @param chatId The target chat_id
     * @param filePath Absolute path to the file on disk
     * @param fileName Override display name for the file (defaults to basename)
     */
    async sendFile(chatId: string, filePath: string, fileName?: string): Promise<{ success: boolean; error?: string }> {
        if (!this.client) {
            return { success: false, error: 'Feishu Client not initialized (missing appId/appSecret).' };
        }
        try {
            const fs = await import('node:fs');
            const path = await import('node:path');
            const displayName = fileName || path.basename(filePath);
            
            if (!fs.existsSync(filePath)) {
                return { success: false, error: `File not found at path: ${filePath}` };
            }

            const stream = fs.createReadStream(filePath);

            console.log(`[Feishu sendFile] 📤 Uploading file: ${displayName} from ${filePath}`);

            // Upload file
            const uploadRes = await (this.client as any).im.file.create({
                data: {
                    file_type: 'stream',
                    file_name: displayName,
                    file: stream,
                },
            });

            console.log(`[Feishu sendFile] 📥 Upload response:`, JSON.stringify(uploadRes));

            // Small SDK quirk: sometimes it returns raw data without code/msg wrapper
            const fileKey = uploadRes?.data?.file_key || uploadRes?.file_key;
            if (!fileKey) {
                const errorCode = uploadRes?.code;
                const errorMsg = uploadRes?.msg || 'Missing file_key';
                return { success: false, error: `Upload failed (code ${errorCode}): ${errorMsg}` };
            }

            console.log(`[Feishu sendFile] 📨 Sending file message. key=${fileKey}, chat=${chatId}`);

            // Send file message to chat
            const sendRes = await this.client.im.message.create({
                params: { receive_id_type: 'chat_id' },
                data: {
                    receive_id: chatId,
                    msg_type: 'file',
                    content: JSON.stringify({ file_key: fileKey }),
                },
            });

            console.log(`[Feishu sendFile] 📥 Send response:`, JSON.stringify(sendRes));

            // If code exists and is non-zero, it's an error. If code is missing, we assume success if no error was thrown.
            if (sendRes?.code !== undefined && sendRes.code !== 0) {
                return { success: false, error: `Send failed (code ${sendRes.code}): ${sendRes.msg}` };
            }

            console.log(`[Feishu sendFile] ✅ File sent successfully`);
            return { success: true };
        } catch (error) {
            console.error(`[Feishu sendFile] ❌ Critical Error:`, error);
            const msg = error instanceof Error ? error.message : String(error);
            return { success: false, error: `Failed to send file as message: ${msg}` };
        }
    }

    /**
     * Start the WebSocket server to listen to incoming events
     * @param onMessage Callback when a P2P or Group message is received
     */
    async startWsServer(onMessage: (event: any, replyFn: (text: string) => Promise<void>) => Promise<void>) {
        if (!this.client) {
            console.warn('[Feishu WS] Cannot start WS server without FEISHU_APP_ID and FEISHU_APP_SECRET.');
            return;
        }

        const eventDispatcher = new lark.EventDispatcher({}).register({
            'im.message.receive_v1': async (data) => {
                console.log(`[Feishu WS Client] Raw data received:`, JSON.stringify(data, null, 2));
                const message = data.message;
                const senderId = data.sender?.sender_id?.open_id || 'unknown'; // Default to open_id, adjust if needed
                const chatId = message.chat_id;
                const chatType = message.chat_type; // 'p2p' or 'group'

                const replyFn = async (text: string) => {
                    // For p2p (private chat), use open_id to reply to the user
                    // For group chat, use chat_id to reply to the group
                    const receiveIdType = chatType === 'p2p' ? 'open_id' : 'chat_id';
                    const receiveId = chatType === 'p2p' ? senderId : chatId;
                    console.log(`[Feishu WS] Replying to ${chatType}: ${receiveIdType}=${receiveId}`);
                    await this.replyText(receiveId, text, receiveIdType);
                };

                await onMessage(data, replyFn);
                return { code: 0 }; // Acknowledge the event
            }
        });

        const wsClient = new lark.WSClient({
            appId: (this.client as any).appId || process.env.FEISHU_APP_ID!,
            appSecret: (this.client as any).appSecret || process.env.FEISHU_APP_SECRET!,
        });

        wsClient.start({
            eventDispatcher,
        });

        console.log('[Feishu WS] WebSocket client started, listening for events...');
    }
}

/**
 * Create a FeishuService instance from environment variables
 */
export function createFeishuService(): FeishuService | null {
    const webhookUrl = process.env.FEISHU_WEBHOOK_URL;
    const appId = process.env.FEISHU_APP_ID;
    const appSecret = process.env.FEISHU_APP_SECRET;

    if (!webhookUrl && (!appId || !appSecret)) {
        console.warn('[Feishu] Neither Webhook nor App credentials found, Feishu disabled.');
        return null;
    }

    return new FeishuService({
        webhookUrl,
        secret: process.env.FEISHU_WEBHOOK_SECRET || undefined,
        appId,
        appSecret,
    });
}
