import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import type { WeightEntry } from '../types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface WeightChartProps {
    entries: WeightEntry[];
}

export function WeightChart({ entries }: WeightChartProps) {
    if (entries.length === 0) {
        return (
            <div className="weight-chart-container">
                <div className="meal-empty">Noch keine Gewichtsdaten vorhanden</div>
            </div>
        );
    }

    const labels = entries.map(e => {
        const date = new Date(e.date);
        return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    });

    const values = entries.map(e => e.value);
    const minWeight = Math.min(...values) - 2;
    const maxWeight = Math.max(...values) + 2;

    const data = {
        labels,
        datasets: [{
            label: 'Gewicht (kg)',
            data: values,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#6366f1',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
        }],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(30, 30, 60, 0.9)',
                titleColor: '#fff',
                bodyColor: '#b4b4c4',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
                cornerRadius: 8,
                padding: 12,
            },
        },
        scales: {
            x: {
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: { color: '#6b6b80', font: { size: 11 } },
            },
            y: {
                min: minWeight,
                max: maxWeight,
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: { color: '#6b6b80', font: { size: 11 } },
            },
        },
    };

    return (
        <div className="weight-chart-container">
            <div style={{ height: '200px' }}>
                <Line data={data} options={options} />
            </div>
        </div>
    );
}
