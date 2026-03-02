/**
 * Feishu (Lark) Webhook and WebSocket Notification Service
 *
 * Provides methods to send messages to Feishu group chats
 * via custom bot webhooks, and listen to incoming messages
 * via WebSocket (Persistent Connection).
 */
import crypto from 'node:crypto';
import * as lark from '@larksuiteoapi/node-sdk';
export class FeishuService {
    constructor(config) {
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
    generateSign(timestamp) {
        if (!this.webhookSecret)
            return '';
        const stringToSign = `${timestamp}\n${this.webhookSecret}`;
        const hmac = crypto.createHmac('sha256', stringToSign);
        return hmac.update('').digest('base64');
    }
    /**
     * Add authentication fields to the message if secret is configured
     */
    addAuth(message) {
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
    async send(message) {
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
            const result = (await response.json());
            if (result.code !== 0) {
                return { success: false, error: result.msg || 'Unknown Feishu API error' };
            }
            return { success: true };
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            return { success: false, error: `Failed to send Feishu notification: ${msg}` };
        }
    }
    /**
     * Send a plain text message via Webhook
     */
    async sendText(text) {
        return this.send({
            msg_type: 'text',
            content: { text },
        });
    }
    /**
     * Send a rich text (post) message via Webhook
     */
    async sendRichText(title, content) {
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
    async replyText(receiveId, text, receiveIdType = 'open_id') {
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
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            return { success: false, error: `Failed to send SDK message: ${msg}` };
        }
    }
    /**
     * Start the WebSocket server to listen to incoming events
     * @param onMessage Callback when a P2P or Group message is received
     */
    async startWsServer(onMessage) {
        if (!this.client) {
            console.warn('[Feishu WS] Cannot start WS server without FEISHU_APP_ID and FEISHU_APP_SECRET.');
            return;
        }
        const eventDispatcher = new lark.EventDispatcher({}).register({
            'im.message.receive_v1': async (data) => {
                const message = data.message;
                const senderId = data.sender?.sender_id?.open_id || 'unknown'; // Default to open_id, adjust if needed
                const chatId = message.chat_id;
                const chatType = message.chat_type; // 'p2p' or 'group'
                const replyFn = async (text) => {
                    // For both p2p and group, we can reply directly to the chat
                    await this.replyText(chatId, text, 'chat_id');
                };
                await onMessage(data, replyFn);
                return { code: 0 }; // Acknowledge the event
            }
        });
        const wsClient = new lark.WSClient({
            appId: this.client.appId || process.env.FEISHU_APP_ID,
            appSecret: this.client.appSecret || process.env.FEISHU_APP_SECRET,
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
export function createFeishuService() {
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
//# sourceMappingURL=feishuService.js.map