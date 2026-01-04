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
    const [editableTotal, setEditableTotal] = useState<number>(editEntry?.pointsTotal || 0);
    const [fromCache, setFromCache] = useState(false);

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

        try {
            const cached = await getCachedFoodResult(foodText, settings?.locale || 'de-DE');

            if (cached) {
                setAiResponse(cached);
                setEditableItems(cached.items);
                setEditableTotal(cached.pointsTotal);
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
                setEditableTotal(response.pointsTotal);
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
        setEditableTotal(updatedItems.reduce((sum, item) => sum + item.points, 0));
    };

    const handleRemoveItem = (index: number) => {
        const updatedItems = editableItems.filter((_, i) => i !== index);
        setEditableItems(updatedItems);
        setEditableTotal(updatedItems.reduce((sum, item) => sum + item.points, 0));
    };

    const handleSave = async () => {
        if (editableItems.length === 0 && !foodText.trim()) {
            showToast('Bitte erst Punkte schätzen', 'warning');
            return;
        }

        const entry: LogEntry = {
            id: editEntry?.id || generateId(),
            mealType,
            rawText: foodText,
            items: editableItems,
            pointsTotal: editableTotal || 0,
            createdAt: editEntry?.createdAt || new Date().toISOString(),
            source: aiResponse ? 'ai' : 'manual',
            notes: notes || undefined,
        };

        try {
            if (editEntry) {
                await updateEntry(editEntry.mealType, editEntry.id, entry);
                showToast('Eintrag aktualisiert', 'success');
            } else {
                await addEntry(entry);
                showToast(`${editableTotal} Punkte gespeichert`, 'success');
            }
            navigate('/');
        } catch {
            showToast('Speichern fehlgeschlagen', 'error');
        }
    };

    const handleManualEntry = () => {
        setEditableItems([{
            name: foodText,
            amountText: '1 Portion',
            points: 0,
        }]);
        setEditableTotal(0);
    };

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

            {!aiResponse && editableItems.length === 0 && (
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

            {(aiResponse || editableItems.length > 0) && (
                <div className="card mb-lg">
                    <div className="card-header">
                        <span className="card-title">
                            {fromCache ? 'Aus Cache' : 'KI-Schätzung'}
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

                    <div className="flex flex-col gap-sm">
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

                    {aiResponse && (
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
                    disabled={editableItems.length === 0 && !foodText.trim()}
                >
                    {editEntry ? 'Aktualisieren' : 'Speichern'}
                </button>
            </div>

            {(aiResponse || editableItems.length > 0) && (
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
