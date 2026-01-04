// ==================== Settings ====================
export interface Settings {
    dailyPoints: number;
    weeklyBonus?: number;
    goal: 'lose' | 'maintain';
    dietaryPrefs: string[];
    noGos: string[];
    locale: string;
    geminiApiKey: string;
    geminiModel?: string;
    onboardingComplete: boolean;
}

export const defaultSettings: Settings = {
    dailyPoints: 23,
    weeklyBonus: 0,
    goal: 'lose',
    dietaryPrefs: [],
    noGos: [],
    locale: 'de-DE',
    geminiApiKey: '',
    geminiModel: 'gemini-2.0-flash',
    onboardingComplete: false,
};

// ==================== Food Items & Entries ====================
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface FoodItem {
    name: string;
    amountText: string;
    points: number;
    assumedPortion?: boolean;
    reasonShort?: string;
}

export interface LogEntry {
    id: string;
    mealType: MealType;
    rawText: string;
    items: FoodItem[];
    pointsTotal: number;
    createdAt: string;
    source: 'ai' | 'manual';
    notes?: string;
}

export interface DayMeals {
    breakfast: LogEntry[];
    lunch: LogEntry[];
    dinner: LogEntry[];
    snack: LogEntry[];
}

export interface DayLog {
    date: string; // YYYY-MM-DD
    meals: DayMeals;
}

// ==================== Weight ====================
export interface WeightEntry {
    date: string; // YYYY-MM-DD
    value: number; // in kg
}

// ==================== AI Cache ====================
export interface AIFoodResponse {
    locale: string;
    raw: string;
    items: FoodItem[];
    pointsTotal: number;
    confidence: number;
    followUpQuestion: string;
    warnings: string[];
}

export interface AIRecommendationItem {
    name: string;
    amountText: string;
    points: number;
}

export interface AIRecommendationSuggestion {
    title: string;
    items: AIRecommendationItem[];
    pointsTotal: number;
    why: string;
    fitScore: number;
}

export interface AIRecommendationResponse {
    mealType: MealType;
    pointsAvailable: number;
    suggestions: AIRecommendationSuggestion[];
    notes: string;
}

export interface CacheEntry {
    key: string;
    result: AIFoodResponse;
    timestamp: number;
}

// ==================== Helpers ====================
export const mealTypeLabels: Record<MealType, string> = {
    breakfast: 'Frühstück',
    lunch: 'Mittagessen',
    dinner: 'Abendessen',
    snack: 'Snacks',
};

export const mealTypeIcons: Record<MealType, string> = {
    breakfast: '🌅',
    lunch: '☀️',
    dinner: '🌙',
    snack: '🍿',
};

export function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

export function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
}

export function getTodayString(): string {
    return formatDate(new Date());
}

export function createEmptyDayMeals(): DayMeals {
    return {
        breakfast: [],
        lunch: [],
        dinner: [],
        snack: [],
    };
}
