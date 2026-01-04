import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { useSettings, useDayLog } from '../db/hooks';
import type { MealType, LogEntry, FoodItem, AIFoodResponse } from '../types';
import { generateId, getTodayString } from '../types';
import type { FoodEstimatorContext } from '../ai/geminiClient';
import { estimateFoodPoints } from '../ai/geminiClient';
import { getCachedFoodResult, cacheFoodResult } from '../ai/cache';

const MEAL_LABELS: Record<MealType, string> = {
    breakfast: 'Frühstück',
    lunch: 'Mittagessen',
    dinner: 'Abendessen',
    snack: 'Snacks',
};

export function Add() {
    const navigate = useNavigate();
    const location = useLocation();
    const { showToast } = useToast();
    const { settings } = useSettings();
    const { addEntry, updateEntry, getTotalPoints } = useDayLog(getTodayString());

    const editEntry = (location.state as { editEntry?: LogEntry })?.editEntry;

    const [foodText, setFoodText] = useState(editEntry?.rawText || '');
    const [mealType, setMealType] = useState<MealType>(editEntry?.mealType || 'lunch');
    const [notes, setNotes] = useState(editEntry?.notes || '');

    const [estimating, setEstimating] = useState(false);
    const [aiResponse, setAiResponse] = useState<AIFoodResponse | null>(null);
    const [editableItems, setEditableItems] = useState<FoodItem[]>(editEntry?.items || []);
    const [manualPoints, setManualPoints] = useState<number | null>(null);
    const [showManualInput, setShowManualInput] = useState(false);
    const [fromCache, setFromCache] = useState(false);

    const editableTotal = manualPoints ?? editableItems.reduce((sum, item) => sum + item.points, 0);

    useEffect(() => {
        if (!editEntry) {
            const hour = new Date().getHours();
            if (hour < 10) setMealType('breakfast');
            else if (hour < 14) setMealType('lunch');
            else if (hour < 18) setMealType('dinner');
            else setMealType('snack');
        }
    }, [editEntry]);

    const handleEstimate = async () => {
        if (!foodText.trim()) {
            showToast('Bitte Mahlzeit eingeben', 'warning');
            return;
        }

        const apiKey = settings?.geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
            showToast('API-Schlüssel fehlt', 'error');
            navigate('/settings');
            return;
        }

        setEstimating(true);
        setAiResponse(null);
        setFromCache(false);
        setManualPoints(null);
        setShowManualInput(false);

        try {
            const cached = await getCachedFoodResult(foodText, settings?.locale || 'de-DE');

            if (cached) {
                setAiResponse(cached);
                setEditableItems(cached.items);
                setFromCache(true);
                showToast('Aus Cache geladen', 'info');
            } else {
                const pointsUsed = getTotalPoints();
                const context: FoodEstimatorContext = {
                    dailyPoints: settings?.dailyPoints || 23,
                    pointsUsed,
                    pointsRemaining: (settings?.dailyPoints || 23) - pointsUsed,
                    dietaryPrefs: settings?.dietaryPrefs || [],
                    noGos: settings?.noGos || [],
                };

                const response = await estimateFoodPoints(
                    apiKey,
                    settings?.geminiModel || 'gemini-2.0-flash',
                    foodText,
                    context
                );

                await cacheFoodResult(foodText, response, settings?.locale || 'de-DE');
                setAiResponse(response);
                setEditableItems(response.items);
            }
        } catch (error) {
            console.error('Estimation error:', error);
            showToast('Schätzung fehlgeschlagen', 'error');
        } finally {
            setEstimating(false);
        }
    };

    const handleItemPointsChange = (index: number, newPoints: number) => {
        const updatedItems = [...editableItems];
        updatedItems[index] = { ...updatedItems[index], points: newPoints };
        setEditableItems(updatedItems);
        setManualPoints(null); // Clear manual override when editing items
    };

    const handleRemoveItem = (index: number) => {
        const updatedItems = editableItems.filter((_, i) => i !== index);
        setEditableItems(updatedItems);

        // If no items left, show manual input
        if (updatedItems.length === 0) {
            setShowManualInput(true);
            setManualPoints(0);
        }
    };

    const handleSave = async () => {
        const finalPoints = editableTotal;

        if (editableItems.length === 0 && !showManualInput && !foodText.trim()) {
            showToast('Bitte erst Punkte schätzen', 'warning');
            return;
        }

        // If manual input mode with no items, create a single item
        const items = editableItems.length > 0
            ? editableItems
            : [{ name: foodText, amountText: '1 Portion', points: finalPoints }];

        const entry: LogEntry = {
            id: editEntry?.id || generateId(),
            mealType,
            rawText: foodText,
            items,
            pointsTotal: finalPoints,
            createdAt: editEntry?.createdAt || new Date().toISOString(),
            source: aiResponse && editableItems.length > 0 ? 'ai' : 'manual',
            notes: notes || undefined,
        };

        try {
            if (editEntry) {
                await updateEntry(editEntry.mealType, editEntry.id, entry);
                showToast('Eintrag aktualisiert', 'success');
            } else {
                await addEntry(entry);
                showToast(`${finalPoints} Punkte gespeichert`, 'success');
            }
            navigate('/');
        } catch {
            showToast('Speichern fehlgeschlagen', 'error');
        }
    };

    const handleManualEntry = () => {
        setShowManualInput(true);
        setManualPoints(0);
        setEditableItems([]);
    };

    const hasEstimation = aiResponse !== null || editableItems.length > 0 || showManualInput;

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">{editEntry ? 'Bearbeiten' : 'Hinzufügen'}</h1>
                <p className="page-subtitle">Beschreibe deine Mahlzeit</p>
            </div>

            <div className="form-group">
                <label className="form-label">Mahlzeit</label>
                <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
                    {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((type) => (
                        <button
                            key={type}
                            className={`btn ${mealType === type ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                            onClick={() => setMealType(type)}
                        >
                            {MEAL_LABELS[type]}
                        </button>
                    ))}
                </div>
            </div>

            <div className="form-group">
                <label className="form-label">Was hast du gegessen?</label>
                <textarea
                    className="form-textarea"
                    value={foodText}
                    onChange={(e) => setFoodText(e.target.value)}
                    placeholder="z.B. 2 Scheiben Pizza mit Salami und eine Cola 0,33l"
                    rows={3}
                />
            </div>

            {!hasEstimation && (
                <div className="flex gap-sm mb-lg">
                    <button
                        className="btn btn-primary btn-lg flex-1"
                        onClick={handleEstimate}
                        disabled={estimating || !foodText.trim()}
                    >
                        {estimating ? 'Schätze...' : 'Punkte schätzen'}
                    </button>
                    <button
                        className="btn btn-secondary btn-lg"
                        onClick={handleManualEntry}
                        disabled={!foodText.trim()}
                    >
                        Manuell
                    </button>
                </div>
            )}

            {hasEstimation && (
                <div className="card mb-lg">
                    <div className="card-header">
                        <span className="card-title">
                            {showManualInput && editableItems.length === 0
                                ? 'Manuelle Eingabe'
                                : fromCache ? 'Aus Cache' : 'KI-Schätzung'}
                        </span>
                        <span style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>
                            {editableTotal} P
                        </span>
                    </div>

                    {aiResponse?.warnings && aiResponse.warnings.length > 0 && (
                        <div className="mb-md text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
                            Hinweis: {aiResponse.warnings.join(', ')}
                        </div>
                    )}

                    {editableItems.length > 0 && (
                        <div className="flex flex-col gap-sm mb-md">
                            {editableItems.map((item, index) => (
                                <div key={index} className="food-entry">
                                    <div className="food-entry-content">
                                        <div className="food-entry-text">{item.name}</div>
                                        <div className="food-entry-items">{item.amountText}</div>
                                    </div>
                                    <input
                                        type="number"
                                        className="form-input"
                                        style={{ width: 60, textAlign: 'center', padding: 'var(--spacing-sm)' }}
                                        value={item.points}
                                        onChange={(e) => handleItemPointsChange(index, parseInt(e.target.value) || 0)}
                                        min={0}
                                    />
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => handleRemoveItem(index)}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Manual points input when all items removed or manual mode */}
                    {(showManualInput || editableItems.length === 0) && (
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Punkte manuell eingeben</label>
                            <input
                                type="number"
                                className="form-input"
                                style={{ fontSize: 'var(--font-size-xl)', textAlign: 'center' }}
                                value={manualPoints ?? 0}
                                onChange={(e) => setManualPoints(parseInt(e.target.value) || 0)}
                                min={0}
                                autoFocus
                            />
                        </div>
                    )}

                    {aiResponse && editableItems.length > 0 && (
                        <div className="mt-md text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
                            Konfidenz: {Math.round((aiResponse.confidence || 0) * 100)}%
                        </div>
                    )}
                </div>
            )}

            <div className="form-group">
                <label className="form-label">Notizen (optional)</label>
                <input
                    type="text"
                    className="form-input"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="z.B. Restaurant"
                />
            </div>

            <div className="flex gap-sm">
                <button className="btn btn-secondary flex-1" onClick={() => navigate('/')}>
                    Abbrechen
                </button>
                <button
                    className="btn btn-primary btn-lg flex-1"
                    onClick={handleSave}
                    disabled={!hasEstimation && !foodText.trim()}
                >
                    {editEntry ? 'Aktualisieren' : 'Speichern'}
                </button>
            </div>

            {hasEstimation && (
                <button
                    className="btn btn-ghost btn-full mt-md"
                    onClick={handleEstimate}
                    disabled={estimating}
                >
                    Neu schätzen
                </button>
            )}
        </div>
    );
}
