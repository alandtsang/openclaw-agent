/**
 * Cron Scheduler
 *
 * Core scheduling engine that manages croner instances for each job.
 * When a job fires, it creates an isolated agent session and runs the prompt.
 * Results are delivered via an external notification callback (e.g. Feishu SDK).
 */

import { Cron } from 'croner';
import { InMemoryRunner } from '@google/adk';
import type { Content } from '@google/genai';
import {
    loadJobs,
    addJob,
    removeJob as removeJobFromStore,
    updateJob,
    generateJobId,
    type CronJobDefinition,
} from './cronStore.js';

/** Map of jobId → active Cron instance */
const activeCrons = new Map<string, Cron>();

let runner: InMemoryRunner | null = null;

/** External notification callback, set during init() */
let notifyFn: ((jobName: string, responseText: string) => Promise<void>) | null = null;

/**
 * Execute a cron job: create an isolated session, send the prompt, collect response.
 */
async function executeJob(jobId: string): Promise<void> {
    if (!runner) {
        console.error('[CronScheduler] Runner not initialized, skipping job:', jobId);
        return;
    }

    // Re-read the job from storage to get latest state (avoids stale closure data)
    const jobs = loadJobs();
    const job = jobs.find((j) => j.id === jobId);
    if (!job) {
        console.error(`[CronScheduler] Job ${jobId} not found in storage, skipping.`);
        return;
    }

    const startTime = Date.now();
    console.log(`\n[CronScheduler] ⏰ Firing job "${job.name}" (${job.id})`);

    try {
        const userId = 'cron-system';
        const sessionId = `cron-session-${job.id}-${Date.now()}`;

        // Create an isolated session for this cron execution
        await runner.sessionService.createSession({
            appName: 'openclaw',
            userId,
            sessionId,
        });

        const userContent: Content = {
            role: 'user',
            parts: [{ text: `[定时任务触发] ${job.prompt}` }],
        };

        let responseText = '';
        const turn = runner.runAsync({
            userId,
            sessionId,
            newMessage: userContent,
        });

        for await (const event of turn) {
            if (event.errorMessage) {
                responseText += `[Error]: ${event.errorMessage}\n`;
            } else if (event.content?.parts) {
                for (const part of event.content.parts) {
                    if (part.text && event.content.role === 'model') {
                        responseText += part.text;
                    }
                }
            }
        }

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[CronScheduler] ✅ Job "${job.name}" completed in ${elapsed}s`);
        if (responseText) {
            console.log(`[CronScheduler] 📝 Response:\n${responseText.slice(0, 500)}`);
        }

        // Update job metadata
        updateJob(job.id, {
            lastRunAt: new Date().toISOString(),
            runCount: job.runCount + 1,
        });

        // Send result via notification callback
        if (responseText && notifyFn) {
            await notifyFn(job.name, responseText);
        }
    } catch (err) {
        console.error(`[CronScheduler] ❌ Job "${job.name}" failed:`, err);
    }
}

/**
 * Start a croner instance for a given job definition.
 */
function startCronInstance(job: CronJobDefinition): void {
    // Stop existing instance if any
    const existing = activeCrons.get(job.id);
    if (existing) {
        existing.stop();
    }

    try {
        // Capture only the jobId — executeJob will re-read latest state from storage
        const jobId = job.id;
        const cronInstance = new Cron(job.schedule, async () => {
            await executeJob(jobId);
        });

        activeCrons.set(job.id, cronInstance);
        const next = cronInstance.nextRun();
        console.log(
            `[CronScheduler] 📅 Scheduled "${job.name}" (${job.schedule})` +
            (next ? `, next run: ${next.toLocaleString()}` : '')
        );
    } catch (err) {
        console.error(`[CronScheduler] Failed to schedule "${job.name}":`, err);
    }
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Initialize the scheduler: load persisted jobs and start all enabled crons.
 */
export function init(
    adkRunner: InMemoryRunner,
    onNotify?: (jobName: string, responseText: string) => Promise<void>,
): void {
    runner = adkRunner;
    notifyFn = onNotify ?? null;

    const jobs = loadJobs();
    const enabledJobs = jobs.filter((j) => j.enabled);

    console.log(`[CronScheduler] Initializing with ${enabledJobs.length} active job(s)...`);

    for (const job of enabledJobs) {
        startCronInstance(job);
    }
}

/**
 * Add a new cron job, persist it, and start its scheduler.
 */
export function scheduleJob(name: string, schedule: string, prompt: string): CronJobDefinition {
    // Deduplication: if a job with the same name already exists, return it
    const existingJobs = loadJobs();
    const duplicate = existingJobs.find((j) => j.name === name && j.enabled);
    if (duplicate) {
        console.log(`[CronScheduler] Job "${name}" already exists (${duplicate.id}), skipping duplicate.`);
        return duplicate;
    }

    // Validate cron expression by doing a dry-run parse
    try {
        const test = new Cron(schedule);
        test.stop();
    } catch (err) {
        throw new Error(`Invalid cron expression "${schedule}": ${err}`);
    }

    const job: CronJobDefinition = {
        id: generateJobId(),
        name,
        schedule,
        prompt,
        enabled: true,
        createdAt: new Date().toISOString(),
        lastRunAt: null,
        runCount: 0,
    };

    addJob(job);
    startCronInstance(job);
    return job;
}

/**
 * Remove a cron job by ID: stop the timer and delete from storage.
 */
export function unscheduleJob(id: string): boolean {
    const cronInstance = activeCrons.get(id);
    if (cronInstance) {
        cronInstance.stop();
        activeCrons.delete(id);
    }
    return removeJobFromStore(id);
}

/**
 * List all cron jobs with their current status.
 */
export function listJobs(): (CronJobDefinition & { nextRun: string | null })[] {
    const jobs = loadJobs();
    return jobs.map((job) => {
        const cronInstance = activeCrons.get(job.id);
        const nextRun = cronInstance?.nextRun()?.toISOString() ?? null;
        return { ...job, nextRun };
    });
}

/**
 * Stop all cron instances (for graceful shutdown).
 */
export function stop(): void {
    console.log(`[CronScheduler] Stopping ${activeCrons.size} cron(s)...`);
    for (const [id, cron] of activeCrons) {
        cron.stop();
    }
    activeCrons.clear();
}
