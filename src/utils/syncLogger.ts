import { v4 as uuidv4 } from 'uuid';

export type SyncLogType = 'info' | 'success' | 'warning' | 'error';

export interface SyncLogEntry {
    id: string;
    timestamp: number;
    type: SyncLogType;
    message: string;
    details?: any;
    source?: string;
}

class SyncLogger {
    private logs: SyncLogEntry[] = [];
    private maxLogs: number = 1000;
    private listeners: Set<(logs: SyncLogEntry[]) => void> = new Set();

    constructor() {
        // Load logs from localStorage if available
        try {
            const savedLogs = localStorage.getItem('sync_logs');
            if (savedLogs) {
                this.logs = JSON.parse(savedLogs);
            }
        } catch (e) {
            console.error('Failed to load sync logs', e);
        }
    }

    log(type: SyncLogType, message: string, details?: any, source?: string) {
        const entry: SyncLogEntry = {
            id: uuidv4(),
            timestamp: Date.now(),
            type,
            message,
            details,
            source
        };

        this.logs.unshift(entry);

        // Trim logs
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(0, this.maxLogs);
        }

        this.persist();
        this.notify();

        // Also log to console
        const style = type === 'error' ? 'color: red' : type === 'warning' ? 'color: orange' : type === 'success' ? 'color: green' : 'color: blue';
        console.log(`%c[Sync:${source || 'General'}] ${message}`, style, details || '');
    }

    info(message: string, details?: any, source?: string) {
        this.log('info', message, details, source);
    }

    success(message: string, details?: any, source?: string) {
        this.log('success', message, details, source);
    }

    warn(message: string, details?: any, source?: string) {
        this.log('warning', message, details, source);
    }

    error(message: string, details?: any, source?: string) {
        this.log('error', message, details, source);
    }

    getLogs(): SyncLogEntry[] {
        return this.logs;
    }

    clear() {
        this.logs = [];
        this.persist();
        this.notify();
    }

    subscribe(listener: (logs: SyncLogEntry[]) => void): () => void {
        this.listeners.add(listener);
        // Initial callback
        listener(this.logs);
        return () => this.listeners.delete(listener);
    }

    private persist() {
        try {
            // Only save last 100 logs to localStorage to avoid quota issues
            localStorage.setItem('sync_logs', JSON.stringify(this.logs.slice(0, 100)));
        } catch (e) {
            // Ignore storage errors
        }
    }

    private notify() {
        this.listeners.forEach(listener => listener(this.logs));
    }
}

export const syncLogger = new SyncLogger();
