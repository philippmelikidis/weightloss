import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PointsBudget } from '../components/PointsBudget';
import { MealSection } from '../components/MealSection';
import { DatePicker } from '../components/DatePicker';
import { Modal } from '../components/Modal';
import { RecommendationsList } from '../components/RecommendationCard';
import { useToast } from '../components/Toast';
import { useSettings, useDayLog } from '../db/hooks';
import type { MealType, LogEntry, AIRecommendationSuggestion } from '../types';
import { formatDate, generateId } from '../types';
import { getMealRecommendations } from '../ai/geminiClient';

export function Home() {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const dateString = formatDate(selectedDate);

    const { settings, loading: settingsLoading } = useSettings();
    const { dayLog, loading: logLoading, removeEntry, getTotalPoints, addEntry } = useDayLog(dateString);
    const { showToast } = useToast();
    const navigate = useNavigate();

    const [showRecommendations, setShowRecommendations] = useState(false);
    const [recommendations, setRecommendations] = useState<AIRecommendationSuggestion[]>([]);
    const [recommendationsLoading, setRecommendationsLoading] = useState(false);
    const [recommendationMealType, setRecommendationMealType] = useState<MealType>('dinner');

    const loading = settingsLoading || logLoading;

    const formatDateLabel = (date: Date): string => {
        const today = new Date();
        if (formatDate(date) === formatDate(today)) return 'Heute';

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (formatDate(date) === formatDate(yesterday)) return 'Gestern';

        return date.toLocaleDateString('de-DE', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
        });
    };

    const handleDeleteEntry = useCallback(async (mealType: MealType, entryId: string) => {
        await removeEntry(mealType, entryId);
        showToast('Eintrag gelöscht', 'success');
    }, [removeEntry, showToast]);

    const handleEditEntry = useCallback((entry: LogEntry) => {
        navigate('/add', { state: { editEntry: entry } });
    }, [navigate]);

    const determineNextMealType = (): MealType => {
        const hour = new Date().getHours();
        if (hour < 10) return 'breakfast';
        if (hour < 14) return 'lunch';
        if (hour < 18) return 'dinner';
        return 'snack';
    };

    const handleGetRecommendations = async () => {
        const apiKey = settings?.geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
            showToast('API-Schlüssel fehlt. Bitte in Einstellungen prüfen.', 'error');
            return;
        }

        const mealType = determineNextMealType();
        setRecommendationMealType(mealType);
        setShowRecommendations(true);
        setRecommendationsLoading(true);

        try {
            const pointsUsed = getTotalPoints();
            const pointsRemaining = (settings?.dailyPoints || 23) - pointsUsed;

            const todaysLog = dayLog ? Object.entries(dayLog.meals).flatMap(([meal, entries]) =>
                entries.map((e: LogEntry) => ({
                    meal,
                    items: e.items.map((i) => i.name),
                    points: e.pointsTotal,
                }))
            ) : [];

            const response = await getMealRecommendations(
                apiKey,
                settings?.geminiModel || 'gemini-2.0-flash',
                {
                    mealType,
                    pointsRemaining: Math.max(0, pointsRemaining),
                    todaysLog,
                    favorites: [],
                    frequentFoods: [],
                    dietaryPrefs: settings?.dietaryPrefs || [],
                    noGos: settings?.noGos || [],
                }
            );

            setRecommendations(response.suggestions);
        } catch (error) {
            console.error('Recommendations error:', error);
            showToast('Empfehlungen konnten nicht geladen werden', 'error');
        } finally {
            setRecommendationsLoading(false);
        }
    };

    const handleAcceptRecommendation = async (suggestion: AIRecommendationSuggestion) => {
        const entry: LogEntry = {
            id: generateId(),
            mealType: recommendationMealType,
            rawText: suggestion.title,
            items: suggestion.items.map(item => ({
                name: item.name,
                amountText: item.amountText,
                points: item.points,
            })),
            pointsTotal: suggestion.pointsTotal,
            createdAt: new Date().toISOString(),
            source: 'ai',
            notes: suggestion.why,
        };

        await addEntry(entry);
        setShowRecommendations(false);
        showToast('Empfehlung übernommen', 'success');
    };

    if (loading) {
        return (
            <div className="page">
                <div className="loading-container">
                    <div className="spinner" />
                    <span className="loading-text">Lädt...</span>
                </div>
            </div>
        );
    }

    const pointsUsed = getTotalPoints();
    const dailyBudget = settings?.dailyPoints || 23;

    return (
        <div className="page">
            <DatePicker selectedDate={selectedDate} onChange={setSelectedDate} />

            <PointsBudget
                dailyBudget={dailyBudget}
                pointsUsed={pointsUsed}
                dateLabel={formatDateLabel(selectedDate)}
            />

            <div className="flex justify-between items-center mb-md">
                <h3>Mahlzeiten</h3>
                <button className="btn btn-secondary btn-sm" onClick={handleGetRecommendations}>
                    Empfehlungen
                </button>
            </div>

            {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((mealType) => (
                <MealSection
                    key={mealType}
                    mealType={mealType}
                    entries={dayLog?.meals[mealType] || []}
                    onDeleteEntry={(entryId) => handleDeleteEntry(mealType, entryId)}
                    onEditEntry={handleEditEntry}
                />
            ))}

            <Modal
                isOpen={showRecommendations}
                onClose={() => setShowRecommendations(false)}
                title="Empfehlungen"
            >
                <RecommendationsList
                    suggestions={recommendations}
                    mealType={recommendationMealType}
                    onAccept={handleAcceptRecommendation}
                    loading={recommendationsLoading}
                />
            </Modal>
        </div>
    );
}
