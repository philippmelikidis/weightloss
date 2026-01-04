import type { AIFoodResponse } from '../types';
import { getCacheEntry, saveCacheEntry } from '../db/database';

// ==================== Cache Key Normalization ====================

/**
 * Normalizes text for cache key generation:
 * - lowercase
 * - trim whitespace
 * - collapse multiple spaces
 * - standardize units (0,33l -> 330ml, etc.)
 * - remove special characters except letters, numbers, spaces
 */
export function normalizeCacheKey(text: string, locale: string = 'de-DE'): string {
    let normalized = text.toLowerCase().trim();

    // Collapse multiple spaces
    normalized = normalized.replace(/\s+/g, ' ');

    // Standardize common units
    // Liters to ml
    normalized = normalized.replace(/(\d+)[,.](\d+)\s*l\b/gi, (_, whole, decimal) => {
        const liters = parseFloat(`${whole}.${decimal}`);
        return `${Math.round(liters * 1000)}ml`;
    });
    normalized = normalized.replace(/(\d+)\s*l\b/gi, (_, num) => `${parseInt(num) * 1000}ml`);

    // Standardize common German abbreviations
    normalized = normalized.replace(/stk\.?/gi, 'stück');
    normalized = normalized.replace(/el\.?/gi, 'esslöffel');
    normalized = normalized.replace(/tl\.?/gi, 'teelöffel');

    // Remove special characters except letters, numbers, spaces, and German umlauts
    normalized = normalized.replace(/[^a-zA-Z0-9äöüßÄÖÜ\s]/g, '');

    // Create cache key with locale prefix
    return `${locale}|${normalized}`;
}

// ==================== Cache Operations ====================

const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function getCachedFoodResult(
    text: string,
    locale: string = 'de-DE'
): Promise<AIFoodResponse | null> {
    const key = normalizeCacheKey(text, locale);

    try {
        const cached = await getCacheEntry(key);

        if (!cached) {
            return null;
        }

        // Check if cache is too old
        if (Date.now() - cached.timestamp > CACHE_MAX_AGE_MS) {
            return null;
        }

        console.log('Cache hit for:', key);
        return cached.result;
    } catch (error) {
        console.error('Cache lookup failed:', error);
        return null;
    }
}

export async function cacheFoodResult(
    text: string,
    result: AIFoodResponse,
    locale: string = 'de-DE'
): Promise<void> {
    const key = normalizeCacheKey(text, locale);

    try {
        await saveCacheEntry({
            key,
            result,
            timestamp: Date.now(),
        });
        console.log('Cached result for:', key);
    } catch (error) {
        console.error('Cache save failed:', error);
    }
}

// ==================== Cache Statistics ====================

export function getCacheStats(): { hits: number; misses: number } {
    // This is a simple in-memory stat tracker
    // In production, you might want to persist this
    return {
        hits: (window as unknown as { __cacheHits?: number }).__cacheHits || 0,
        misses: (window as unknown as { __cacheMisses?: number }).__cacheMisses || 0,
    };
}

export function incrementCacheHit(): void {
    const w = window as unknown as { __cacheHits?: number };
    w.__cacheHits = (w.__cacheHits || 0) + 1;
}

export function incrementCacheMiss(): void {
    const w = window as unknown as { __cacheMisses?: number };
    w.__cacheMisses = (w.__cacheMisses || 0) + 1;
}
