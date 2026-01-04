# PointsTracker - Punkte & Gewicht PWA

Eine mobile-first Progressive Web App für Punkte-basiertes Food-Tracking mit KI-Integration (Gemini AI).

![App Screenshot](./docs/screenshot.png)

## Features

- 🎯 **Punkte-Tracking**: Täglich Punkte verwalten (ähnlich Weight Watchers)
- 🤖 **KI-Schätzung**: Automatische Punkte-Schätzung durch Gemini AI
- 💡 **Meal-Empfehlungen**: KI-basierte Vorschläge für nächste Mahlzeiten
- ⚖️ **Gewichtstracking**: Verlauf mit Chart und Trend-Anzeige
- 📊 **Verlauf**: Kalender-Ansicht aller Tage
- 📱 **PWA**: Installierbar auf Smartphone, funktioniert offline
- 🔒 **Lokal**: Alle Daten im Browser gespeichert, kein Server
- 💾 **Export/Import**: JSON-Backup deiner Daten

## Tech Stack

- ⚡ Vite + React 18 + TypeScript
- 📦 IndexedDB (via `idb`)
- 📊 Chart.js
- 🔌 PWA mit Workbox
- 🎨 Vanilla CSS (Dark Theme mit Glassmorphism)

## Schnellstart

### 1. Abhängigkeiten installieren

```bash
npm install
```

### 2. Development Server starten

```bash
npm run dev
```

Die App läuft auf `http://localhost:5173`

### 3. Production Build

```bash
npm run build
```

Die gebauten Dateien liegen in `dist/`.

## Deployment

### GitHub Pages

1. Repository auf GitHub erstellen
2. In `vite.config.ts` die `base` auf deinen Repo-Namen setzen:
   ```ts
   base: '/dein-repo-name/'
   ```
3. Build erstellen: `npm run build`
4. Den `dist/` Ordner deployen (z.B. mit `gh-pages`)

```bash
npm install -D gh-pages
npx gh-pages -d dist
```

### Netlify

1. Repository mit Netlify verbinden
2. Build Command: `npm run build`
3. Publish Directory: `dist`

### Vercel

1. Repository mit Vercel importieren
2. Framework Preset: Vite
3. Build & Deploy

## Gemini API Key

Die App benötigt einen Gemini API Key für die KI-Funktionen:

1. Gehe zu [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Erstelle einen neuen API Key
3. Gib den Key beim Onboarding oder in den Settings ein

> ⚠️ Der API Key wird nur lokal in deinem Browser gespeichert und nie an Server gesendet (außer an die Gemini API).

## Projektstruktur

```
src/
├── ai/
│   ├── cache.ts        # AI Response Caching
│   ├── geminiClient.ts # Gemini API Client
│   └── prompts.ts      # System & Developer Prompts
├── components/
│   ├── DatePicker.tsx
│   ├── FoodEntryCard.tsx
│   ├── MealSection.tsx
│   ├── Modal.tsx
│   ├── Navigation.tsx
│   ├── PointsBudget.tsx
│   ├── RecommendationCard.tsx
│   ├── Toast.tsx
│   └── WeightChart.tsx
├── db/
│   ├── database.ts     # IndexedDB Wrapper
│   └── hooks.ts        # React Hooks für Daten
├── pages/
│   ├── Add.tsx         # Essen eintragen
│   ├── History.tsx     # Kalender & Verlauf
│   ├── Home.tsx        # Tagesübersicht
│   ├── Onboarding.tsx  # Setup Wizard
│   ├── Settings.tsx    # Einstellungen
│   └── Weight.tsx      # Gewichtstracking
├── types/
│   └── index.ts        # TypeScript Interfaces
├── App.tsx
├── main.tsx
└── index.css           # Design System
```

## Datenmodelle

### Settings
- `dailyPoints`: Tagespunkte-Budget
- `weeklyBonus`: Wöchentlicher Bonus (optional)
- `goal`: 'lose' | 'maintain'
- `dietaryPrefs`: Ernährungsstil-Tags
- `noGos`: Allergien/Ausschlüsse
- `geminiApiKey`: API Key (lokal gespeichert)

### LogEntry
- `id`: Eindeutige ID
- `mealType`: 'breakfast' | 'lunch' | 'dinner' | 'snack'
- `rawText`: Original-Eingabe
- `items`: Erkannte Food-Items mit Punkten
- `pointsTotal`: Gesamtpunkte
- `source`: 'ai' | 'manual'

### WeightEntry
- `date`: Datum (YYYY-MM-DD)
- `value`: Gewicht in kg

## Offline-Funktionalität

Die App funktioniert vollständig offline:
- Service Worker cached alle Assets
- IndexedDB speichert alle Daten lokal
- AI-Responses werden für 7 Tage gecached

## Lizenz

MIT

---

Made with 💜 in Germany
