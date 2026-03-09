/**
 * Cron Job Persistent Store
 *
 * Handles reading/writing cron job definitions to a JSON file.
 * Data is stored at {projectRoot}/data/cron-jobs.json.
 */

import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const DATA_DIR = path.join(rootDir, 'data');
const JOBS_FILE = path.join(DATA_DIR, 'cron-jobs.json');

export interface CronJobDefinition {
    id: string;
    name: string;
    /** Standard cron expression, e.g. "0 9 * * *" */
    schedule: string;
    /** The prompt sent to the agent when this job fires */
    prompt: string;
    enabled: boolean;
    createdAt: string;
    lastRunAt: string | null;
    runCount: number;
}

function ensureDataDir(): void {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

export function loadJobs(): CronJobDefinition[] {
    ensureDataDir();
    if (!fs.existsSync(JOBS_FILE)) {
        return [];
    }
    try {
        const raw = fs.readFileSync(JOBS_FILE, 'utf-8');
        return JSON.parse(raw) as CronJobDefinition[];
    } catch (err) {
        console.error('[CronStore] Failed to parse jobs file:', err);
        return [];
    }
}

export function saveJobs(jobs: CronJobDefinition[]): void {
    ensureDataDir();
    fs.writeFileSync(JOBS_FILE, JSON.stringify(jobs, null, 2), 'utf-8');
}

export function addJob(job: CronJobDefinition): void {
    const jobs = loadJobs();
    jobs.push(job);
    saveJobs(jobs);
}

export function removeJob(id: string): boolean {
    const jobs = loadJobs();
    const idx = jobs.findIndex((j) => j.id === id);
    if (idx === -1) return false;
    jobs.splice(idx, 1);
    saveJobs(jobs);
    return true;
}

export function updateJob(id: string, partial: Partial<CronJobDefinition>): boolean {
    const jobs = loadJobs();
    const job = jobs.find((j) => j.id === id);
    if (!job) return false;
    Object.assign(job, partial);
    saveJobs(jobs);
    return true;
}

export function generateJobId(): string {
    return `cron_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
