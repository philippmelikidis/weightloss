import type { LogEntry, MealType } from '../types';
import { FoodEntryCard } from './FoodEntryCard';

interface MealSectionProps {
    mealType: MealType;
    entries: LogEntry[];
    onDeleteEntry: (entryId: string) => void;
    onEditEntry: (entry: LogEntry) => void;
}

const MEAL_LABELS: Record<MealType, string> = {
    breakfast: 'Frühstück',
    lunch: 'Mittagessen',
    dinner: 'Abendessen',
    snack: 'Snacks',
};

export function MealSection({ mealType, entries, onDeleteEntry, onEditEntry }: MealSectionProps) {
    const totalPoints = entries.reduce((sum, entry) => sum + entry.pointsTotal, 0);

    return (
        <div className="meal-section">
            <div className="meal-header">
                <span className="meal-title">{MEAL_LABELS[mealType]}</span>
                {totalPoints > 0 && <span className="meal-points">{totalPoints} P</span>}
            </div>

            {entries.length > 0 ? (
                <div className="meal-entries">
                    {entries.map((entry) => (
                        <FoodEntryCard
                            key={entry.id}
                            entry={entry}
                            onEdit={() => onEditEntry(entry)}
                            onDelete={() => onDeleteEntry(entry.id)}
                        />
                    ))}
                </div>
            ) : (
                <div className="meal-empty">Keine Einträge</div>
            )}
        </div>
    );
}
