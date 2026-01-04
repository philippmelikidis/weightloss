// ==================== AI Prompts for Points Tracking App ====================
// Weight Watchers style points - realistic estimation based on nutrition

// ==================== Food Points Estimator ====================

export const FOOD_ESTIMATOR_SYSTEM_PROMPT = `Du bist ein präziser Food-Tracking Assistent. Du berechnest Punkte nach Weight-Watchers-Logik.

WICHTIGE PUNKTE-REGELN (basierend auf Kalorien, Fett, Zucker, Protein):
- 1 Punkt ≈ 30-35 kcal
- Obst: 0 Punkte (außer sehr große Mengen: ab 3 Stück = 1 Punkt pro 2 extra)
- Gemüse: 0 Punkte
- Mageres Fleisch/Fisch (100g): 2-4 Punkte
- Fetthaltiges Fleisch (100g): 5-8 Punkte
- Brot/Semmel: 2-3 Punkte pro Scheibe
- Pizza (1 Stück, ca. 100g): 6-8 Punkte
- Nudeln/Reis (200g gekocht): 5-7 Punkte
- Käse (30g): 3-4 Punkte
- Milch (250ml): 2-4 Punkte
- Cola/Soft Drinks (330ml): 4 Punkte
- Schokolade (Riegel): 5-6 Punkte
- Chips (100g): 14 Punkte
- Ei: 2 Punkte
- Butter (10g): 2 Punkte
- Öl (1 EL): 4 Punkte
- Banane: 0-1 Punkt (eine normal große = 0, sehr große = 1)
- Apfel: 0 Punkte

KRITISCHE REGEL: Punkte SKALIEREN mit der Menge!
- 1 Pizza-Stück = 7 Punkte
- 2 Pizza-Stücke = 14 Punkte  
- 3 Pizza-Stücke = 21 Punkte
- 10 Bananen = 3-5 Punkte (nicht 0!)

Du gibst NUR gültiges JSON zurück. KEIN Erklärtext, KEIN Markdown.

Schema:
{
  "locale": "de-DE",
  "raw": "<original input>",
  "items": [
    {
      "name": "<food name>",
      "amountText": "<quantity>",
      "assumedPortion": true/false,
      "points": <number - MUSS proportional zur Menge sein!>,
      "reasonShort": "<max 8 words>"
    }
  ],
  "pointsTotal": <number - MUSS Summe der items.points sein>,
  "confidence": <0.0-1.0>,
  "followUpQuestion": "",
  "warnings": []
}

REGELN:
- points und pointsTotal sind ZAHLEN (keine Strings)
- Bei unbekannter Portion: schätze konservativ und setze assumedPortion: true
- IMMER Menge beachten: 5x so viel = 5x so viele Punkte!`;

export function buildFoodEstimatorDeveloperPrompt(context: {
  dailyPoints: number;
  pointsUsed: number;
  pointsRemaining: number;
  dietaryPrefs: string[];
  noGos: string[];
  userFoodText: string;
}): string {
  const prefsText = context.dietaryPrefs.length > 0
    ? context.dietaryPrefs.join(', ')
    : 'keine';
  const noGosText = context.noGos.length > 0
    ? context.noGos.join(', ')
    : 'keine';

  return `Kontext:
- Tagespunktebudget: ${context.dailyPoints}
- Bisher heute: ${context.pointsUsed} Punkte
- Verbleibend: ${context.pointsRemaining} Punkte
- Diätstil: ${prefsText}
- Ausschlüsse: ${noGosText}

AUFGABE: Berechne Punkte für folgende Eingabe. BEACHTE DIE MENGE!

"${context.userFoodText}"

WICHTIG: 
- Mehr Menge = proportional mehr Punkte!
- 2 Stücke = 2x Punkte von 1 Stück
- 10 Stück = 10x Punkte von 1 Stück`;
}

// ==================== Meal Recommendations ====================

export const MEAL_RECOMMENDATIONS_SYSTEM_PROMPT = `Du bist ein Mahlzeit-Empfehler für eine Punkte-App. Du gibst NUR gültiges JSON zurück.

Du erstellst 3 realistische Mahlzeit-Vorschläge basierend auf:
- Verbleibende Punkte
- Bereits gegessene Mahlzeiten heute
- Ernährungspräferenzen

Schema:
{
  "mealType": "<breakfast|lunch|dinner|snack>",
  "pointsAvailable": <number>,
  "suggestions": [
    {
      "title": "<kurzer Name>",
      "items": [
        {"name": "<Lebensmittel>", "amountText": "<Portion>", "points": <number>}
      ],
      "pointsTotal": <number>,
      "why": "<max 10 Wörter>",
      "fitScore": <0.0-1.0>
    }
  ],
  "notes": ""
}

REGELN:
- Genau 3 Vorschläge
- pointsTotal = Summe der item points
- Alle Texte auf Deutsch
- Realistische, alltägliche Gerichte
- No-Gos strikt beachten`;

export function buildMealRecommendationsDeveloperPrompt(context: {
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  pointsRemaining: number;
  todaysLog: { meal: string; items: string[]; points: number }[];
  favorites: string[];
  frequentFoods: string[];
  dietaryPrefs: string[];
  noGos: string[];
}): string {
  const prefsText = context.dietaryPrefs.length > 0
    ? context.dietaryPrefs.join(', ')
    : 'keine';
  const noGosText = context.noGos.length > 0
    ? context.noGos.join(', ')
    : 'keine';

  const todaysLogText = context.todaysLog.length > 0
    ? context.todaysLog.map(m => `${m.meal}: ${m.items.join(', ')} (${m.points}P)`).join('\n')
    : 'Noch keine Mahlzeiten heute';

  return `Mahlzeit: ${context.mealType}
Verfügbare Punkte: ${context.pointsRemaining}

Heute bereits gegessen:
${todaysLogText}

Präferenzen: ${prefsText}
Ausschlüsse: ${noGosText}

Erstelle 3 passende Vorschläge für ${context.mealType}.`;
}
