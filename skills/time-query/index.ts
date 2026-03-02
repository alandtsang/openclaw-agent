import { FunctionTool } from '@google/adk';
import { z } from 'zod/v4';

export const timeQueryTool = new FunctionTool({
    name: 'time_query',
    description: '获取当前的准确日期和时间。',
    parameters: z.object({
        timezone: z.string().optional().describe('可选的时区标识符，如 Asia/Shanghai。如果不填，默认返回服务器本地时间。')
    }),
    execute: async ({ timezone }) => {
        try {
            const now = new Date();
            const options: Intl.DateTimeFormatOptions = {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
                timeZone: timezone || 'Asia/Shanghai'
            };
            return {
                status: 'success',
                currentTime: now.toLocaleString('zh-CN', options),
                timestamp: now.getTime()
            };
        } catch (error: any) {
            return {
                status: 'error',
                message: `获取时间失败: ${error.message}`
            };
        }
    }
});
