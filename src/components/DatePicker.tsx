import { formatDate } from '../types';

interface DatePickerProps {
    selectedDate: Date;
    onChange: (date: Date) => void;
}

export function DatePicker({ selectedDate, onChange }: DatePickerProps) {
    const goToPrevDay = () => {
        const prev = new Date(selectedDate);
        prev.setDate(prev.getDate() - 1);
        onChange(prev);
    };

    const goToNextDay = () => {
        const next = new Date(selectedDate);
        next.setDate(next.getDate() + 1);
        onChange(next);
    };

    const goToToday = () => {
        onChange(new Date());
    };

    const isToday = formatDate(selectedDate) === formatDate(new Date());

    const formatDateLabel = (date: Date): string => {
        if (isToday) return 'Heute';

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (formatDate(date) === formatDate(yesterday)) return 'Gestern';

        return date.toLocaleDateString('de-DE', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
        });
    };

    return (
        <div className="date-picker">
            <button className="date-picker-btn" onClick={goToPrevDay}>
                ‹
            </button>

            <div className="date-picker-current">
                <strong>{formatDateLabel(selectedDate)}</strong>
            </div>

            <button className="date-picker-btn" onClick={goToNextDay}>
                ›
            </button>

            {!isToday && (
                <button className="date-picker-today" onClick={goToToday}>
                    Heute
                </button>
            )}
        </div>
    );
}
