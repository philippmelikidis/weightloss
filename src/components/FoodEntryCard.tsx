import type { LogEntry } from '../types';

interface FoodEntryCardProps {
    entry: LogEntry;
    onEdit: () => void;
    onDelete: () => void;
}

export function FoodEntryCard({ entry, onEdit, onDelete }: FoodEntryCardProps) {
    const itemsText = entry.items.map((i) => i.name).join(', ');

    return (
        <div className="food-entry" onClick={onEdit}>
            <div className="food-entry-content">
                <div className="food-entry-text">{entry.rawText || itemsText}</div>
                {entry.items.length > 1 && (
                    <div className="food-entry-items">
                        {entry.items.length} Elemente
                    </div>
                )}
            </div>
            <div className="food-entry-points">{entry.pointsTotal}</div>
            <button
                className="btn btn-ghost btn-sm"
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                }}
            >
                ×
            </button>
        </div>
    );
}
