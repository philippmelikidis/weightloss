import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import type {
    Settings,
    DayLog,
    WeightEntry,
    CacheEntry,
} from '../types';
import {
    defaultSettings,
    createEmptyDayMeals,
} from '../types';

// ==================== Database Schema ====================
interface PointsTrackerDB extends DBSchema {
    settings: {
        key: string;
        value: Settings;
    };
    logs: {
        key: string; // date YYYY-MM-DD
        value: DayLog;
        indexes: { 'by-date': string };
    };
    weight: {
        key: string; // date YYYY-MM-DD
        value: WeightEntry;
        indexes: { 'by-date': string };
    };
    cache: {
        key: string; // normalized cache key
        value: CacheEntry;
        indexes: { 'by-timestamp': number };
    };
}

const DB_NAME = 'points-tracker-db';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<PointsTrackerDB> | null = null;

// ==================== Database Initialization ====================
export async function getDB(): Promise<IDBPDatabase<PointsTrackerDB>> {
    if (dbInstance) return dbInstance;

    dbInstance = await openDB<PointsTrackerDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
            // Settings store
            if (!db.objectStoreNames.contains('settings')) {
                db.createObjectStore('settings');
            }

            // Logs store
            if (!db.objectStoreNames.contains('logs')) {
                const logsStore = db.createObjectStore('logs', { keyPath: 'date' });
                logsStore.createIndex('by-date', 'date');
            }

            // Weight store
            if (!db.objectStoreNames.contains('weight')) {
                const weightStore = db.createObjectStore('weight', { keyPath: 'date' });
                weightStore.createIndex('by-date', 'date');
            }

            // Cache store
            if (!db.objectStoreNames.contains('cache')) {
                const cacheStore = db.createObjectStore('cache', { keyPath: 'key' });
                cacheStore.createIndex('by-timestamp', 'timestamp');
            }
        },
    });

    return dbInstance;
}

// ==================== Settings Operations ====================
export async function getSettings(): Promise<Settings> {
    const db = await getDB();
    const settings = await db.get('settings', 'main');
    return settings || defaultSettings;
}

export async function saveSettings(settings: Settings): Promise<void> {
    const db = await getDB();
    await db.put('settings', settings, 'main');
}

export async function updateSettings(updates: Partial<Settings>): Promise<Settings> {
    const current = await getSettings();
    const updated = { ...current, ...updates };
    await saveSettings(updated);
    return updated;
}

// ==================== Log Operations ====================
export async function getDayLog(date: string): Promise<DayLog> {
    const db = await getDB();
    const log = await db.get('logs', date);
    return log || { date, meals: createEmptyDayMeals() };
}

export async function saveDayLog(dayLog: DayLog): Promise<void> {
    const db = await getDB();
    await db.put('logs', dayLog);
}

export async function getAllLogs(): Promise<DayLog[]> {
    const db = await getDB();
    return db.getAll('logs');
}

export async function getLogsInRange(startDate: string, endDate: string): Promise<DayLog[]> {
    const db = await getDB();
    const all = await db.getAll('logs');
    return all.filter((log) => log.date >= startDate && log.date <= endDate);
}

// ==================== Weight Operations ====================
export async function getWeightEntry(date: string): Promise<WeightEntry | undefined> {
    const db = await getDB();
    return db.get('weight', date);
}

export async function saveWeightEntry(entry: WeightEntry): Promise<void> {
    const db = await getDB();
    await db.put('weight', entry);
}

export async function getAllWeightEntries(): Promise<WeightEntry[]> {
    const db = await getDB();
    const entries = await db.getAll('weight');
    return entries.sort((a, b) => a.date.localeCompare(b.date));
}

export async function deleteWeightEntry(date: string): Promise<void> {
    const db = await getDB();
    await db.delete('weight', date);
}

// ==================== Cache Operations ====================
export async function getCacheEntry(key: string): Promise<CacheEntry | undefined> {
    const db = await getDB();
    return db.get('cache', key);
}

export async function saveCacheEntry(entry: CacheEntry): Promise<void> {
    const db = await getDB();
    await db.put('cache', entry);
}

export async function clearOldCache(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    const db = await getDB();
    const all = await db.getAll('cache');
    const now = Date.now();

    for (const entry of all) {
        if (now - entry.timestamp > maxAgeMs) {
            await db.delete('cache', entry.key);
        }
    }
}

// ==================== Export/Import Operations ====================
export interface ExportData {
    version: number;
    exportedAt: string;
    settings: Settings;
    logs: DayLog[];
    weight: WeightEntry[];
}

export async function exportAllData(): Promise<ExportData> {
    const settings = await getSettings();
    const logs = await getAllLogs();
    const weight = await getAllWeightEntries();

    return {
        version: 1,
        exportedAt: new Date().toISOString(),
        settings,
        logs,
        weight,
    };
}

export async function importDataFromBackup(
    data: ExportData,
    mode: 'merge' | 'overwrite'
): Promise<void> {
    if (mode === 'overwrite') {
        await clearAllData();
    }

    // Import settings (always overwrite for settings)
    await saveSettings(data.settings);

    // Import logs
    for (const log of data.logs) {
        if (mode === 'overwrite') {
            await saveDayLog(log);
        } else {
            const existing = await getDayLog(log.date);
            if (existing.meals.breakfast.length === 0 &&
                existing.meals.lunch.length === 0 &&
                existing.meals.dinner.length === 0 &&
                existing.meals.snack.length === 0) {
                await saveDayLog(log);
            }
        }
    }

    // Import weight
    for (const entry of data.weight) {
        await saveWeightEntry(entry);
    }
}

export async function clearAllData(): Promise<void> {
    const db = await getDB();
    await db.clear('settings');
    await db.clear('logs');
    await db.clear('weight');
    await db.clear('cache');
}
