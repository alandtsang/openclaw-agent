/**
 * Feishu (Lark) Webhook and WebSocket Notification Service
 *
 * Provides methods to send messages to Feishu group chats
 * via custom bot webhooks, and listen to incoming messages
 * via WebSocket (Persistent Connection).
 */
import * as lark from '@larksuiteoapi/node-sdk';
export interface FeishuConfig {
    webhookUrl?: string;
    secret?: string;
    appId?: string;
    appSecret?: string;
}
export declare class FeishuService {
    private webhookUrl?;
    private webhookSecret?;
    client?: lark.Client;
    constructor(config: FeishuConfig);
    /**
     * Generate signature for webhook security verification
     */
    private generateSign;
    /**
     * Add authentication fields to the message if secret is configured
     */
    private addAuth;
    /**
     * Send a raw message payload to the Feishu webhook
     */
    private send;
    /**
     * Send a plain text message via Webhook
     */
    sendText(text: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Send a rich text (post) message via Webhook
     */
    sendRichText(title: string, content: unknown[][]): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Send a plain text message via Official SDK (requires appId and appSecret)
     */
    replyText(receiveId: string, text: string, receiveIdType?: 'open_id' | 'user_id' | 'union_id' | 'email' | 'chat_id'): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Start the WebSocket server to listen to incoming events
     * @param onMessage Callback when a P2P or Group message is received
     */
    startWsServer(onMessage: (event: any, replyFn: (text: string) => Promise<void>) => Promise<void>): Promise<void>;
}
/**
 * Create a FeishuService instance from environment variables
 */
export declare function createFeishuService(): FeishuService | null;
