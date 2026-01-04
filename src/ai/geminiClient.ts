import type { AIFoodResponse, AIRecommendationResponse, MealType } from '../types';
import {
    FOOD_ESTIMATOR_SYSTEM_PROMPT,
    buildFoodEstimatorDeveloperPrompt,
    MEAL_RECOMMENDATIONS_SYSTEM_PROMPT,
    buildMealRecommendationsDeveloperPrompt,
} from './prompts';

// ==================== Gemini API Client ====================

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

interface GeminiResponse {
    candidates: Array<{
        content: {
            parts: Array<{
                text: string;
            }>;
        };
    }>;
    error?: {
        message: string;
        code: number;
    };
}

async function callGemini(
    apiKey: string,
    model: string,
    systemPrompt: string,
    userPrompt: string
): Promise<string> {
    const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;

    const requestBody = {
        contents: [
            {
                role: 'user',
                parts: [{ text: userPrompt }],
            },
        ],
        systemInstruction: {
            parts: [{ text: systemPrompt }],
        },
        generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.3,
            maxOutputTokens: 2048,
        },
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data: GeminiResponse = await response.json();

    if (data.error) {
        throw new Error(`Gemini API error: ${data.error.message}`);
    }

    if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No response from Gemini API');
    }

    const text = data.candidates[0].content.parts[0].text;
    return text;
}

// ==================== Food Points Estimation ====================

export interface FoodEstimatorContext {
    dailyPoints: number;
    pointsUsed: number;
    pointsRemaining: number;
    dietaryPrefs: string[];
    noGos: string[];
}

export async function estimateFoodPoints(
    apiKey: string,
    model: string,
    foodText: string,
    context: FoodEstimatorContext
): Promise<AIFoodResponse> {
    const developerPrompt = buildFoodEstimatorDeveloperPrompt({
        ...context,
        userFoodText: foodText,
    });

    const responseText = await callGemini(
        apiKey,
        model,
        FOOD_ESTIMATOR_SYSTEM_PROMPT,
        developerPrompt
    );

    try {
        const parsed = JSON.parse(responseText) as AIFoodResponse;

        // Validate required fields
        if (typeof parsed.pointsTotal !== 'number') {
            throw new Error('Invalid response: pointsTotal must be a number');
        }
        if (!Array.isArray(parsed.items)) {
            throw new Error('Invalid response: items must be an array');
        }

        // Ensure all items have numeric points
        parsed.items = parsed.items.map(item => ({
            ...item,
            points: typeof item.points === 'number' ? item.points : parseInt(String(item.points)) || 0,
        }));

        // Recalculate total to ensure consistency
        const calculatedTotal = parsed.items.reduce((sum, item) => sum + item.points, 0);
        if (Math.abs(calculatedTotal - parsed.pointsTotal) > 0.5) {
            parsed.pointsTotal = calculatedTotal;
        }

        return parsed;
    } catch (parseError) {
        console.error('Failed to parse Gemini response:', responseText);
        throw new Error(`Failed to parse AI response: ${parseError}`);
    }
}

// ==================== Meal Recommendations ====================

export interface RecommendationsContext {
    mealType: MealType;
    pointsRemaining: number;
    todaysLog: { meal: string; items: string[]; points: number }[];
    favorites: string[];
    frequentFoods: string[];
    dietaryPrefs: string[];
    noGos: string[];
}

export async function getMealRecommendations(
    apiKey: string,
    model: string,
    context: RecommendationsContext
): Promise<AIRecommendationResponse> {
    const developerPrompt = buildMealRecommendationsDeveloperPrompt(context);

    const responseText = await callGemini(
        apiKey,
        model,
        MEAL_RECOMMENDATIONS_SYSTEM_PROMPT,
        developerPrompt
    );

    try {
        const parsed = JSON.parse(responseText) as AIRecommendationResponse;

        // Validate required fields
        if (!Array.isArray(parsed.suggestions) || parsed.suggestions.length !== 3) {
            throw new Error('Invalid response: suggestions must have exactly 3 entries');
        }

        // Validate each suggestion
        parsed.suggestions = parsed.suggestions.map(suggestion => {
            const items = suggestion.items.map(item => ({
                ...item,
                points: typeof item.points === 'number' ? item.points : parseInt(String(item.points)) || 0,
            }));

            const calculatedTotal = items.reduce((sum, item) => sum + item.points, 0);

            return {
                ...suggestion,
                items,
                pointsTotal: calculatedTotal,
                fitScore: typeof suggestion.fitScore === 'number' ? suggestion.fitScore : 0.5,
            };
        });

        return parsed;
    } catch (parseError) {
        console.error('Failed to parse Gemini response:', responseText);
        throw new Error(`Failed to parse AI response: ${parseError}`);
    }
}

// ==================== API Key Validation ====================

export async function validateApiKey(apiKey: string, model: string = 'gemini-2.0-flash'): Promise<boolean> {
    try {
        const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: 'Hi' }] }],
                generationConfig: { maxOutputTokens: 10 },
            }),
        });

        return response.ok;
    } catch {
        return false;
    }
}
