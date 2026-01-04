import { useState } from 'react';
import type { Settings } from '../types';
import { defaultSettings } from '../types';
import { saveSettings } from '../db/database';
import { useToast } from '../components/Toast';

interface OnboardingProps {
    onComplete: () => void;
}

const GOAL_POINTS: Record<string, { points: number; description: string }> = {
    lose_fast: { points: 18, description: 'Schnelles Abnehmen' },
    lose_moderate: { points: 23, description: 'Moderates Abnehmen' },
    lose_slow: { points: 27, description: 'Langsames Abnehmen' },
    maintain: { points: 30, description: 'Gewicht halten' },
};

const DIETARY_OPTIONS = [
    'Vegetarisch',
    'Vegan',
    'Pescetarisch',
    'Low-Carb',
    'High-Protein',
    'Mediterran',
];

const COMMON_NO_GOS = [
    'Schweinefleisch',
    'Laktose',
    'Gluten',
    'Nüsse',
    'Meeresfrüchte',
    'Eier',
    'Soja',
];

export function Onboarding({ onComplete }: OnboardingProps) {
    const [step, setStep] = useState(1);
    const [selectedGoal, setSelectedGoal] = useState<string>('lose_moderate');
    const [customPoints, setCustomPoints] = useState<number | null>(null);
    const [settings, setSettings] = useState<Settings>({
        ...defaultSettings,
    });
    const { showToast } = useToast();

    const totalSteps = 3;

    const currentPoints = customPoints ?? GOAL_POINTS[selectedGoal]?.points ?? 23;

    const handleNext = async () => {
        if (step === totalSteps) {
            // Save and complete
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
            await saveSettings({
                ...settings,
                dailyPoints: currentPoints,
                geminiApiKey: apiKey,
                onboardingComplete: true
            });
            showToast('Einrichtung abgeschlossen', 'success');
            onComplete();
        } else {
            setStep(step + 1);
        }
    };

    const handleBack = () => {
        if (step > 1) setStep(step - 1);
    };

    const toggleDietaryPref = (pref: string) => {
        setSettings((prev) => ({
            ...prev,
            dietaryPrefs: prev.dietaryPrefs.includes(pref)
                ? prev.dietaryPrefs.filter((p) => p !== pref)
                : [...prev.dietaryPrefs, pref],
        }));
    };

    const toggleNoGo = (noGo: string) => {
        setSettings((prev) => ({
            ...prev,
            noGos: prev.noGos.includes(noGo)
                ? prev.noGos.filter((n) => n !== noGo)
                : [...prev.noGos, noGo],
        }));
    };

    return (
        <div className="onboarding">
            <div className="onboarding-header">
                <div className="onboarding-logo">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5" />
                        <path d="M2 12l10 5 10-5" />
                    </svg>
                </div>
                <h1 className="onboarding-title">PointsTracker</h1>
                <p className="onboarding-subtitle">Dein intelligenter Punkte-Begleiter</p>
            </div>

            <div className="onboarding-step-indicator">
                {Array.from({ length: totalSteps }).map((_, i) => (
                    <div key={i} className={`step-dot ${i + 1 === step ? 'active' : ''}`} />
                ))}
            </div>

            <div className="onboarding-step">
                <div className="onboarding-content">
                    {step === 1 && (
                        <>
                            <h2 className="mb-md">Was ist dein Ziel?</h2>
                            <p className="text-muted mb-lg">
                                Wähle dein Ziel und wir berechnen dein empfohlenes Tagesbudget.
                            </p>

                            <div className="flex flex-col gap-sm">
                                {Object.entries(GOAL_POINTS).map(([key, value]) => (
                                    <button
                                        key={key}
                                        className={`btn ${selectedGoal === key ? 'btn-primary' : 'btn-secondary'} btn-full`}
                                        onClick={() => {
                                            setSelectedGoal(key);
                                            setCustomPoints(null);
                                        }}
                                        style={{ justifyContent: 'space-between' }}
                                    >
                                        <span>{value.description}</span>
                                        <span>{value.points} Punkte</span>
                                    </button>
                                ))}
                            </div>

                            <div className="goal-suggestion">
                                <div className="goal-suggestion-label">Dein empfohlenes Tagesbudget</div>
                                <div className="goal-suggestion-points">{currentPoints}</div>
                                <div className="goal-suggestion-hint">Punkte pro Tag</div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Oder eigenen Wert eingeben</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={customPoints ?? ''}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        setCustomPoints(isNaN(val) ? null : val);
                                    }}
                                    placeholder="z.B. 25"
                                    min={10}
                                    max={50}
                                />
                            </div>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <h2 className="mb-md">Ernährungspräferenzen</h2>
                            <p className="text-muted mb-lg">
                                Optional: Hilft der KI bei besseren Empfehlungen.
                            </p>

                            <div className="chip-container">
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

                            <h3 className="mt-lg mb-md">Unverträglichkeiten & No-Gos</h3>
                            <p className="text-muted mb-md">
                                Diese Lebensmittel werden bei Empfehlungen ausgeschlossen.
                            </p>

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
                        </>
                    )}

                    {step === 3 && (
                        <>
                            <h2 className="mb-md">Alles bereit</h2>
                            <p className="text-muted mb-lg">
                                Deine Einstellungen sind gespeichert. Du kannst jetzt loslegen.
                            </p>

                            <div className="card mb-lg">
                                <div className="card-header">
                                    <span className="card-title">Zusammenfassung</span>
                                </div>

                                <div className="flex justify-between mb-md">
                                    <span className="text-muted">Tagesbudget</span>
                                    <span style={{ fontWeight: 600 }}>{currentPoints} Punkte</span>
                                </div>

                                <div className="flex justify-between mb-md">
                                    <span className="text-muted">Ziel</span>
                                    <span style={{ fontWeight: 600 }}>{GOAL_POINTS[selectedGoal]?.description || 'Eigenes Ziel'}</span>
                                </div>

                                {settings.dietaryPrefs.length > 0 && (
                                    <div className="flex justify-between mb-md">
                                        <span className="text-muted">Ernährung</span>
                                        <span style={{ fontWeight: 600 }}>{settings.dietaryPrefs.join(', ')}</span>
                                    </div>
                                )}

                                {settings.noGos.length > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-muted">Ausschlüsse</span>
                                        <span style={{ fontWeight: 600 }}>{settings.noGos.length} Einträge</span>
                                    </div>
                                )}
                            </div>

                            <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
                                Du kannst alle Einstellungen später in den Einstellungen ändern.
                            </p>
                        </>
                    )}
                </div>

                <div className="onboarding-actions">
                    {step > 1 && (
                        <button className="btn btn-secondary" onClick={handleBack}>
                            Zurück
                        </button>
                    )}
                    <button
                        className="btn btn-primary btn-lg flex-1"
                        onClick={handleNext}
                    >
                        {step === totalSteps ? 'Fertig' : 'Weiter'}
                    </button>
                </div>
            </div>
        </div>
    );
}
