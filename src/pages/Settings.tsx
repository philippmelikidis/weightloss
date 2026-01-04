import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { useSettings } from '../db/hooks';
import type { ExportData } from '../db/database';
import { exportAllData, importDataFromBackup, clearAllData } from '../db/database';

const DIETARY_OPTIONS = ['Vegetarisch', 'Vegan', 'Pescetarisch', 'Low-Carb', 'High-Protein', 'Mediterran'];
const COMMON_NO_GOS = ['Schweinefleisch', 'Laktose', 'Gluten', 'Nüsse', 'Meeresfrüchte', 'Eier', 'Soja'];

export function Settings() {
    const navigate = useNavigate();
    const { settings, loading, updateSettings } = useSettings();
    const { showToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [showResetModal, setShowResetModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [importMode, setImportMode] = useState<'merge' | 'overwrite'>('merge');
    const [importDataState, setImportDataState] = useState<ExportData | null>(null);

    if (loading || !settings) {
        return <div className="page"><div className="loading-container"><div className="spinner" /></div></div>;
    }

    const handleExport = async () => {
        try {
            const data = await exportAllData();
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `pointstracker-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('Export erfolgreich', 'success');
        } catch {
            showToast('Export fehlgeschlagen', 'error');
        }
    };

    const handleImportClick = () => fileInputRef.current?.click();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const text = await file.text();
            const data = JSON.parse(text) as ExportData;
            if (!data.version || !data.settings || !data.logs) throw new Error('Ungültiges Format');
            setImportDataState(data);
            setShowImportModal(true);
        } catch {
            showToast('Ungültige Datei', 'error');
        }
        e.target.value = '';
    };

    const handleImportConfirm = async () => {
        if (!importDataState) return;
        try {
            await importDataFromBackup(importDataState, importMode);
            showToast('Import erfolgreich', 'success');
            setShowImportModal(false);
            setImportDataState(null);
            window.location.reload();
        } catch {
            showToast('Import fehlgeschlagen', 'error');
        }
    };

    const handleReset = async () => {
        try {
            await clearAllData();
            showToast('Daten gelöscht', 'success');
            setShowResetModal(false);
            navigate('/');
            window.location.reload();
        } catch {
            showToast('Löschen fehlgeschlagen', 'error');
        }
    };

    const toggleDietaryPref = async (pref: string) => {
        const newPrefs = settings.dietaryPrefs.includes(pref)
            ? settings.dietaryPrefs.filter((p) => p !== pref)
            : [...settings.dietaryPrefs, pref];
        await updateSettings({ dietaryPrefs: newPrefs });
    };

    const toggleNoGo = async (noGo: string) => {
        const newNoGos = settings.noGos.includes(noGo)
            ? settings.noGos.filter((n) => n !== noGo)
            : [...settings.noGos, noGo];
        await updateSettings({ noGos: newNoGos });
    };

    return (
        <div className="page">
            <div className="page-header"><h1 className="page-title">Einstellungen</h1></div>

            <div className="settings-section">
                <h3 className="settings-section-title">Punkte</h3>
                <div className="card">
                    <div className="form-group">
                        <label className="form-label">Tagespunkte</label>
                        <input
                            type="number"
                            className="form-input"
                            value={settings.dailyPoints}
                            onChange={(e) => updateSettings({ dailyPoints: parseInt(e.target.value) || 0 })}
                            min={1}
                            max={100}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Wochenbonus</label>
                        <input
                            type="number"
                            className="form-input"
                            value={settings.weeklyBonus || ''}
                            onChange={(e) => updateSettings({ weeklyBonus: parseInt(e.target.value) || 0 })}
                            placeholder="Optional"
                            min={0}
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Ziel</label>
                        <div className="flex gap-sm">
                            <button
                                className={`btn ${settings.goal === 'lose' ? 'btn-primary' : 'btn-secondary'} flex-1`}
                                onClick={() => updateSettings({ goal: 'lose' })}
                            >
                                Abnehmen
                            </button>
                            <button
                                className={`btn ${settings.goal === 'maintain' ? 'btn-primary' : 'btn-secondary'} flex-1`}
                                onClick={() => updateSettings({ goal: 'maintain' })}
                            >
                                Halten
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="settings-section">
                <h3 className="settings-section-title">Ernährung</h3>
                <div className="card">
                    <div className="chip-container mb-lg">
                        {DIETARY_OPTIONS.map((option) => (
                            <button
                                key={option}
                                className={`chip ${settings.dietaryPrefs.includes(option) ? 'active' : ''}`}
                                onClick={() => toggleDietaryPref(option)}
                            >
                                {option}
                            </button>
                        ))}
                    </div>

                    <label className="form-label">Ausschlüsse</label>
                    <div className="chip-container">
                        {COMMON_NO_GOS.map((noGo) => (
                            <button
                                key={noGo}
                                className={`chip ${settings.noGos.includes(noGo) ? 'active' : ''}`}
                                onClick={() => toggleNoGo(noGo)}
                            >
                                {noGo}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="settings-section">
                <h3 className="settings-section-title">KI-Modell</h3>
                <div className="card">
                    <select
                        className="form-select"
                        value={settings.geminiModel || 'gemini-2.0-flash'}
                        onChange={(e) => updateSettings({ geminiModel: e.target.value })}
                    >
                        <option value="gemini-2.0-flash">Gemini 2.0 Flash (schnell)</option>
                        <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                        <option value="gemini-1.5-pro">Gemini 1.5 Pro (genauer)</option>
                    </select>
                    <p className="form-helper mt-sm">API-Schlüssel wird aus .env Datei geladen</p>
                </div>
            </div>

            <div className="settings-section">
                <h3 className="settings-section-title">Daten</h3>
                <div className="flex gap-sm mb-md">
                    <button className="btn btn-secondary flex-1" onClick={handleExport}>Exportieren</button>
                    <button className="btn btn-secondary flex-1" onClick={handleImportClick}>Importieren</button>
                </div>
                <button className="btn btn-danger btn-full" onClick={() => setShowResetModal(true)}>
                    Alle Daten löschen
                </button>
                <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileChange} style={{ display: 'none' }} />
            </div>

            <div className="settings-section">
                <h3 className="settings-section-title">Information</h3>
                <div className="card">
                    <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
                        PointsTracker v1.0.0<br />
                        Alle Daten werden lokal gespeichert.
                    </p>
                </div>
            </div>

            <Modal isOpen={showResetModal} onClose={() => setShowResetModal(false)} title="Daten löschen">
                <p className="mb-lg">Alle Einträge und Einstellungen werden unwiderruflich gelöscht.</p>
                <div className="flex gap-sm">
                    <button className="btn btn-secondary flex-1" onClick={() => setShowResetModal(false)}>Abbrechen</button>
                    <button className="btn btn-danger flex-1" onClick={handleReset}>Löschen</button>
                </div>
            </Modal>

            <Modal isOpen={showImportModal} onClose={() => { setShowImportModal(false); setImportDataState(null); }} title="Daten importieren">
                {importDataState && (
                    <>
                        <div className="card mb-md">
                            <p style={{ fontSize: 'var(--font-size-sm)' }}>Backup: {new Date(importDataState.exportedAt).toLocaleDateString('de-DE')}</p>
                            <p style={{ fontSize: 'var(--font-size-sm)' }}>{importDataState.logs.length} Tage, {importDataState.weight.length} Gewichtseinträge</p>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Modus</label>
                            <div className="flex gap-sm">
                                <button className={`btn ${importMode === 'merge' ? 'btn-primary' : 'btn-secondary'} flex-1`} onClick={() => setImportMode('merge')}>Zusammenführen</button>
                                <button className={`btn ${importMode === 'overwrite' ? 'btn-danger' : 'btn-secondary'} flex-1`} onClick={() => setImportMode('overwrite')}>Ersetzen</button>
                            </div>
                        </div>
                        <div className="flex gap-sm">
                            <button className="btn btn-secondary flex-1" onClick={() => { setShowImportModal(false); setImportDataState(null); }}>Abbrechen</button>
                            <button className="btn btn-primary flex-1" onClick={handleImportConfirm}>Importieren</button>
                        </div>
                    </>
                )}
            </Modal>
        </div>
    );
}
