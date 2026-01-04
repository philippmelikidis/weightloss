import { useState } from 'react';
import { WeightChart } from '../components/WeightChart';
import { useToast } from '../components/Toast';
import { useWeightHistory } from '../db/hooks';
import { getTodayString } from '../types';

export function Weight() {
    const { entries, loading, addOrUpdateEntry, removeEntry, getLatestEntry, getTrend } = useWeightHistory();
    const { showToast } = useToast();

    const [newWeight, setNewWeight] = useState('');
    const [selectedDate, setSelectedDate] = useState(getTodayString());
    const [showForm, setShowForm] = useState(false);

    const latestEntry = getLatestEntry();
    const trend = getTrend();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const weight = parseFloat(newWeight.replace(',', '.'));
        if (isNaN(weight) || weight <= 0 || weight > 500) {
            showToast('Ungültiges Gewicht', 'error');
            return;
        }

        await addOrUpdateEntry({ date: selectedDate, value: weight });
        showToast('Gespeichert', 'success');
        setNewWeight('');
        setShowForm(false);
    };

    const handleDelete = async (date: string) => {
        if (confirm('Eintrag löschen?')) {
            await removeEntry(date);
            showToast('Gelöscht', 'success');
        }
    };

    const formatTrend = () => {
        if (!trend) return null;
        const sign = trend.diff > 0 ? '+' : '';
        return `${sign}${trend.diff.toFixed(1)} kg`;
    };

    if (loading) {
        return (
            <div className="page">
                <div className="loading-container">
                    <div className="spinner" />
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Gewicht</h1>
            </div>

            {latestEntry && (
                <div className="card mb-lg">
                    <div className="flex justify-between items-center">
                        <div>
                            <div className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
                                {new Date(latestEntry.date).toLocaleDateString('de-DE')}
                            </div>
                            <div style={{ fontSize: '48px', fontWeight: 700, lineHeight: 1 }}>
                                {latestEntry.value.toFixed(1)}
                                <span style={{ fontSize: 'var(--font-size-lg)', fontWeight: 400, marginLeft: '4px' }}>kg</span>
                            </div>
                        </div>
                        {trend && (
                            <div className={`weight-trend-diff ${trend.direction === 'up' ? 'positive' : 'negative'}`}>
                                {formatTrend()}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {!showForm ? (
                <button className="btn btn-primary btn-lg btn-full mb-lg" onClick={() => setShowForm(true)}>
                    Eintrag hinzufügen
                </button>
            ) : (
                <form onSubmit={handleSubmit} className="card mb-lg">
                    <h4 className="mb-md">Neuer Eintrag</h4>

                    <div className="form-group">
                        <label className="form-label">Datum</label>
                        <input
                            type="date"
                            className="form-input"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            max={getTodayString()}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Gewicht (kg)</label>
                        <input
                            type="text"
                            inputMode="decimal"
                            className="form-input"
                            value={newWeight}
                            onChange={(e) => setNewWeight(e.target.value)}
                            placeholder="z.B. 75,5"
                            autoFocus
                        />
                    </div>

                    <div className="flex gap-sm">
                        <button type="button" className="btn btn-secondary flex-1" onClick={() => setShowForm(false)}>
                            Abbrechen
                        </button>
                        <button type="submit" className="btn btn-primary flex-1">
                            Speichern
                        </button>
                    </div>
                </form>
            )}

            {entries.length > 0 && (
                <>
                    <h3 className="mb-md">Verlauf</h3>
                    <WeightChart entries={entries} />

                    <h3 className="mb-md mt-lg">Einträge</h3>
                    <div className="meal-entries">
                        {[...entries].reverse().slice(0, 10).map((entry) => (
                            <div key={entry.date} className="food-entry">
                                <div className="food-entry-content">
                                    <div className="food-entry-text">
                                        {new Date(entry.date).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })}
                                    </div>
                                </div>
                                <div className="food-entry-points">{entry.value.toFixed(1)} kg</div>
                                <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(entry.date)}>×</button>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {entries.length === 0 && !showForm && (
                <div className="card text-center">
                    <h3 className="mb-sm">Noch keine Daten</h3>
                    <p className="text-muted">Füge deinen ersten Gewichtseintrag hinzu.</p>
                </div>
            )}
        </div>
    );
}
