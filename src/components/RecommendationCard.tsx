import type { AIRecommendationSuggestion, MealType } from '../types';

interface RecommendationCardProps {
    suggestion: AIRecommendationSuggestion;
    onAccept: () => void;
}

const MEAL_LABELS: Record<MealType, string> = {
    breakfast: 'Frühstück',
    lunch: 'Mittagessen',
    dinner: 'Abendessen',
    snack: 'Snacks',
};

export function RecommendationCard({ suggestion, onAccept }: RecommendationCardProps) {
    return (
        <div className="recommendation-card">
            <div className="recommendation-header">
                <span className="recommendation-title">{suggestion.title}</span>
                <span className="recommendation-points">{suggestion.pointsTotal} P</span>
            </div>

            <div className="recommendation-why">{suggestion.why}</div>

            <div className="recommendation-items">
                {suggestion.items.map((item, index) => (
                    <span key={index} className="recommendation-item">
                        {item.amountText} {item.name} ({item.points}P)
                    </span>
                ))}
            </div>

            <button className="btn btn-primary btn-sm btn-full" onClick={onAccept}>
                Übernehmen
            </button>
        </div>
    );
}

interface RecommendationsListProps {
    suggestions: AIRecommendationSuggestion[];
    mealType: MealType;
    onAccept: (suggestion: AIRecommendationSuggestion) => void;
    loading?: boolean;
}

export function RecommendationsList({ suggestions, mealType, onAccept, loading }: RecommendationsListProps) {
    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner" />
                <span className="loading-text">Empfehlungen werden geladen...</span>
            </div>
        );
    }

    if (suggestions.length === 0) {
        return <div className="meal-empty">Keine Empfehlungen verfügbar</div>;
    }

    return (
        <div>
            <p className="text-muted mb-md">Vorschläge für {MEAL_LABELS[mealType]}</p>
            {suggestions.map((suggestion, index) => (
                <RecommendationCard
                    key={index}
                    suggestion={suggestion}
                    onAccept={() => onAccept(suggestion)}
                />
            ))}
        </div>
    );
}
