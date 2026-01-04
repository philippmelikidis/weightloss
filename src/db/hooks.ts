import { useState, useEffect, useCallback } from 'react';
import {
    getSettings,
    saveSettings,
    getDayLog,
    saveDayLog,
    getAllWeightEntries,
    saveWeightEntry,
    deleteWeightEntry,
} from './database';
import type {
    Settings,
    DayLog,
    WeightEntry,
    LogEntry,
    MealType,
} from '../types';

// ==================== useSettings Hook ====================
export function useSettings() {
    const [settings, setSettings] = useState<Settings | null>(null);
    const [loading, setLoading] = useState(true);

    const loadSettings = useCallback(async () => {
        setLoading(true);
        try {
            const s = await getSettings();
            setSettings(s);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    const updateSettingsLocal = useCallback(async (updates: Partial<Settings>) => {
        if (!settings) return;
        const updated = { ...settings, ...updates };
        setSettings(updated);
        await saveSettings(updated);
    }, [settings]);

    return { settings, loading, updateSettings: updateSettingsLocal, reload: loadSettings };
}

// ==================== useDayLog Hook ====================
export function useDayLog(date: string) {
    const [dayLog, setDayLog] = useState<DayLog | null>(null);
    const [loading, setLoading] = useState(true);

    const loadDayLog = useCallback(async () => {
        setLoading(true);
        try {
            const log = await getDayLog(date);
            setDayLog(log);
        } finally {
            setLoading(false);
        }
    }, [date]);

    useEffect(() => {
        loadDayLog();
    }, [loadDayLog]);

    const addEntry = useCallback(async (entry: LogEntry) => {
        if (!dayLog) return;

        const updatedMeals = { ...dayLog.meals };
        updatedMeals[entry.mealType] = [...updatedMeals[entry.mealType], entry];

        const updatedLog = { ...dayLog, meals: updatedMeals };
        setDayLog(updatedLog);
        await saveDayLog(updatedLog);
    }, [dayLog]);

    const removeEntry = useCallback(async (mealType: MealType, entryId: string) => {
        if (!dayLog) return;

        const updatedMeals = { ...dayLog.meals };
        updatedMeals[mealType] = updatedMeals[mealType].filter((e) => e.id !== entryId);

        const updatedLog = { ...dayLog, meals: updatedMeals };
        setDayLog(updatedLog);
        await saveDayLog(updatedLog);
    }, [dayLog]);

    const updateEntry = useCallback(async (mealType: MealType, entryId: string, updates: Partial<LogEntry>) => {
        if (!dayLog) return;

        const updatedMeals = { ...dayLog.meals };
        updatedMeals[mealType] = updatedMeals[mealType].map((e) =>
            e.id === entryId ? { ...e, ...updates } : e
        );

        const updatedLog = { ...dayLog, meals: updatedMeals };
        setDayLog(updatedLog);
        await saveDayLog(updatedLog);
    }, [dayLog]);

    const getTotalPoints = useCallback(() => {
        if (!dayLog) return 0;

        return Object.values(dayLog.meals).reduce((total: number, entries: LogEntry[]) => {
            return total + entries.reduce((sum: number, entry: LogEntry) => sum + entry.pointsTotal, 0);
        }, 0);
    }, [dayLog]);

    return {
        dayLog,
        loading,
        addEntry,
        removeEntry,
        updateEntry,
        getTotalPoints,
        reload: loadDayLog,
    };
}

// ==================== useWeightHistory Hook ====================
export function useWeightHistory() {
    const [entries, setEntries] = useState<WeightEntry[]>([]);
    const [loading, setLoading] = useState(true);

    const loadEntries = useCallback(async () => {
        setLoading(true);
        try {
            const all = await getAllWeightEntries();
            setEntries(all);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadEntries();
    }, [loadEntries]);

    const addOrUpdateEntry = useCallback(async (entry: WeightEntry) => {
        await saveWeightEntry(entry);
        await loadEntries();
    }, [loadEntries]);

    const removeEntry = useCallback(async (date: string) => {
        await deleteWeightEntry(date);
        await loadEntries();
    }, [loadEntries]);

    const getLatestEntry = useCallback(() => {
        if (entries.length === 0) return null;
        return entries[entries.length - 1];
    }, [entries]);

    const getTrend = useCallback(() => {
        if (entries.length < 2) return null;

        const latest = entries[entries.length - 1];
        const previous = entries[entries.length - 2];
        const diff = latest.value - previous.value;

        return {
            diff,
            percentage: ((diff / previous.value) * 100).toFixed(1),
            direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable' as const,
        };
    }, [entries]);

    return {
        entries,
        loading,
        addOrUpdateEntry,
        removeEntry,
        getLatestEntry,
        getTrend,
        reload: loadEntries,
    };
}
