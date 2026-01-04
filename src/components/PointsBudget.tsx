interface PointsBudgetProps {
    dailyBudget: number;
    pointsUsed: number;
    dateLabel?: string;
}

export function PointsBudget({ dailyBudget, pointsUsed, dateLabel }: PointsBudgetProps) {
    const remaining = dailyBudget - pointsUsed;
    const progressPercent = Math.min((pointsUsed / dailyBudget) * 100, 100);
    const isOver = remaining < 0;

    return (
        <div className="points-budget">
            {dateLabel && (
                <div className="points-budget-header">
                    <span className="points-budget-date">{dateLabel}</span>
                </div>
            )}

            <div className="points-budget-main">
                <div className={`points-remaining ${isOver ? 'negative' : ''}`}>
                    {remaining}
                </div>
                <div className="points-remaining-label">
                    {isOver ? 'Punkte über Budget' : 'Punkte übrig'}
                </div>
            </div>

            <div className="points-progress">
                <div
                    className={`points-progress-bar ${isOver ? 'over' : ''}`}
                    style={{ width: `${progressPercent}%` }}
                />
            </div>

            <div className="points-budget-details">
                <div className="points-detail">
                    <div className="points-detail-value">{pointsUsed}</div>
                    <div className="points-detail-label">Verwendet</div>
                </div>
                <div className="points-detail">
                    <div className="points-detail-value">{dailyBudget}</div>
                    <div className="points-detail-label">Budget</div>
                </div>
            </div>
        </div>
    );
}
