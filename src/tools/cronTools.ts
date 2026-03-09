/**
 * Cron Tools
 *
 * ADK FunctionTool definitions for managing cron/scheduled tasks.
 * Provides cron_add, cron_list, and cron_remove tools.
 */

import { FunctionTool } from '@google/adk';
import { z } from 'zod/v4';
import * as cronScheduler from '../cron/index.js';

export const cronAdd = new FunctionTool({
    name: 'cron_add',
    description:
        '添加一个新的定时任务。任务会按 cron 表达式定期执行，每次触发时将 prompt 作为消息发送给 Agent 处理。注意：每个用户请求只需调用一次此工具，同名任务不会重复创建。',
    parameters: z.object({
        name: z.string().describe('任务名称，简短描述该定时任务的用途'),
        schedule: z
            .string()
            .describe(
                '标准 cron 表达式，例如: "*/5 * * * *" (每5分钟), "0 9 * * *" (每天9点), "0 9 * * 1" (每周一9点)'
            ),
        prompt: z
            .string()
            .describe('定时触发时要执行的任务描述/提示词，Agent 会基于此内容执行相应操作'),
    }),
    execute: async ({ name, schedule, prompt }) => {
        try {
            const job = cronScheduler.scheduleJob(name, schedule, prompt);
            return {
                status: 'success',
                message: `定时任务 "${name}" 创建成功`,
                job: {
                    id: job.id,
                    name: job.name,
                    schedule: job.schedule,
                    prompt: job.prompt,
                },
            };
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return { status: 'error', message: `创建定时任务失败: ${msg}` };
        }
    },
});

export const cronList = new FunctionTool({
    name: 'cron_list',
    description: '列出所有已注册的定时任务，包括状态和下次执行时间。',
    parameters: z.object({}),
    execute: async () => {
        try {
            const jobs = cronScheduler.listJobs();
            if (jobs.length === 0) {
                return { status: 'success', message: '当前没有定时任务', jobs: [] };
            }
            return {
                status: 'success',
                message: `共有 ${jobs.length} 个定时任务`,
                jobs: jobs.map((j) => ({
                    id: j.id,
                    name: j.name,
                    schedule: j.schedule,
                    prompt: j.prompt,
                    enabled: j.enabled,
                    lastRunAt: j.lastRunAt,
                    nextRun: j.nextRun,
                    runCount: j.runCount,
                })),
            };
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return { status: 'error', message: `列出定时任务失败: ${msg}` };
        }
    },
});

export const cronRemove = new FunctionTool({
    name: 'cron_remove',
    description: '删除一个指定的定时任务。需要提供任务 ID。',
    parameters: z.object({
        job_id: z.string().describe('要删除的定时任务 ID'),
    }),
    execute: async ({ job_id }) => {
        try {
            const removed = cronScheduler.unscheduleJob(job_id);
            if (removed) {
                return { status: 'success', message: `定时任务 ${job_id} 已删除` };
            }
            return { status: 'error', message: `未找到 ID 为 ${job_id} 的定时任务` };
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return { status: 'error', message: `删除定时任务失败: ${msg}` };
        }
    },
});

export const cronTools = [cronAdd, cronList, cronRemove];
