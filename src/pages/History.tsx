import { useState, useEffect } from 'react';
import { getAllLogs, getDayLog } from '../db/database';
import { useSettings } from '../db/hooks';
import type { DayLog, LogEntry } from '../types';
import { formatDate } from '../types';

interface DaySummary {
    date: string;
    pointsTotal: number;
    hasMeals: boolean;
}

const MEAL_LABELS: Record<string, string> = {
    breakfast: 'Frühstück',
    lunch: 'Mittagessen',
    dinner: 'Abendessen',
    snack: 'Snacks',
};

export function History() {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [daySummaries, setDaySummaries] = useState<Map<string, DaySummary>>(new Map());
    const [selectedDay, setSelectedDay] = useState<DayLog | null>(null);
    const [loading, setLoading] = useState(true);
    const { settings } = useSettings();

    useEffect(() => {
        loadMonthData();
    }, [currentMonth]);

    const loadMonthData = async () => {
        setLoading(true);
        try {
            const logs = await getAllLogs();
            const summaries = new Map<string, DaySummary>();

            logs.forEach((log) => {
                const totalPoints = Object.values(log.meals).reduce(
                    (sum: number, entries: LogEntry[]) =>
                        sum + entries.reduce((s: number, e: LogEntry) => s + e.pointsTotal, 0),
                    0
                );
                const hasMeals = Object.values(log.meals).some((entries: LogEntry[]) => entries.length > 0);
                summaries.set(log.date, { date: log.date, pointsTotal: totalPoints, hasMeals });
            });

            setDaySummaries(summaries);
        } finally {
            setLoading(false);
        }
    };

    const handleDayClick = async (date: string) => {
        const log = await getDayLog(date);
        setSelectedDay(log);
    };

    const goToPrevMonth = () => {
        const prev = new Date(currentMonth);
        prev.setMonth(prev.getMonth() - 1);
        setCurrentMonth(prev);
    };

    const goToNextMonth = () => {
        const next = new Date(currentMonth);
        next.setMonth(next.getMonth() + 1);
        setCurrentMonth(next);
    };

    const getDaysInMonth = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = (firstDay.getDay() + 6) % 7;

        const days: (number | null)[] = [];
        for (let i = 0; i < startingDay; i++) days.push(null);
        for (let i = 1; i <= daysInMonth; i++) days.push(i);
        return days;
    };

    const formatMonthYear = (date: Date): string => {
        return date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
    };

    const getDateString = (day: number): string => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        return formatDate(new Date(year, month, day));
    };

    const stats = {
        totalDays: daySummaries.size,
        avgPoints: daySummaries.size > 0
            ? Math.round(
                Array.from(daySummaries.values()).reduce((sum, d) => sum + d.pointsTotal, 0) /
                daySummaries.size
            )
            : 0,
        underBudgetDays: Array.from(daySummaries.values()).filter(
            (d) => d.pointsTotal <= (settings?.dailyPoints || 23)
        ).length,
    };

    const days = getDaysInMonth();
    const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Verlauf</h1>
            </div>

            <div className="flex gap-sm mb-lg">
                <div className="card flex-1 text-center">
                    <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-accent)' }}>
                        {stats.totalDays}
                    </div>
                    <div className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>Tage</div>
                </div>
                <div className="card flex-1 text-center">
                    <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>
                        {stats.avgPoints}
                    </div>
                    <div className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>Durchschnitt</div>
                </div>
                <div className="card flex-1 text-center">
                    <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-success)' }}>
                        {stats.underBudgetDays}
                    </div>
                    <div className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>Im Budget</div>
                </div>
            </div>

            <div className="flex justify-between items-center mb-md">
                <button className="btn btn-ghost" onClick={goToPrevMonth}>Zurück</button>
                <h3>{formatMonthYear(currentMonth)}</h3>
                <button className="btn btn-ghost" onClick={goToNextMonth}>Weiter</button>
            </div>

            <div className="card mb-lg">
                <div className="history-calendar" style={{ marginBottom: 'var(--spacing-sm)' }}>
                    {weekDays.map((day) => (
                        <div key={day} style={{ textAlign: 'center', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                            {day}
                        </div>
                    ))}
                </div>

                <div className="history-calendar">
                    {days.map((day, index) => {
                        if (day === null) return <div key={`empty-${index}`} />;

                        const dateString = getDateString(day);
                        const summary = daySummaries.get(dateString);
                        const isToday = dateString === formatDate(new Date());
                        const isSelected = selectedDay?.date === dateString;
                        const isOverBudget = summary && summary.pointsTotal > (settings?.dailyPoints || 23);

                        return (
                            <button
                                key={day}
                                className={`calendar-day ${summary?.hasMeals ? 'has-data' : ''} ${isSelected ? 'selected' : ''}`}
                                onClick={() => handleDayClick(dateString)}
                                style={{
                                    border: isToday ? '2px solid var(--color-accent)' : undefined,
                                    background: isOverBudget ? 'var(--color-danger)' : undefined,
                                }}
                            >
                                <span className="calendar-day-number">{day}</span>
                                {summary?.hasMeals && <span className="calendar-day-points">{summary.pointsTotal}</span>}
                            </button>
                        );
                    })}
                </div>
            </div>

            {selectedDay && (
                <div className="card">
                    <h4 className="mb-md">
                        {new Date(selectedDay.date).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </h4>

                    {Object.entries(selectedDay.meals).map(([mealType, entries]) => {
                        const typedEntries = entries as LogEntry[];
                        if (typedEntries.length === 0) return null;
                        const totalPoints = typedEntries.reduce((sum: number, e: LogEntry) => sum + e.pointsTotal, 0);

                        return (
                            <div key={mealType} className="mb-md">
                                <div className="flex justify-between items-center mb-sm">
                                    <span style={{ fontWeight: 500 }}>{MEAL_LABELS[mealType]}</span>
                                    <span className="text-muted">{totalPoints} P</span>
                                </div>
                                <div className="meal-entries">
                                    {typedEntries.map((entry: LogEntry) => (
                                        <div key={entry.id} className="food-entry">
                                            <div className="food-entry-content">
                                                <div className="food-entry-text">{entry.rawText}</div>
                                            </div>
                                            <div className="food-entry-points">{entry.pointsTotal}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}

                    {Object.values(selectedDay.meals).every((entries) => (entries as LogEntry[]).length === 0) && (
                        <p className="text-muted text-center">Keine Einträge</p>
                    )}
                </div>
            )}

            {loading && (
                <div className="loading-container">
                    <div className="spinner" />
                </div>
            )}
        </div>
    );
}
