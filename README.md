# 🔮 Whatnot Fantasy Mana-Leaderboard (OBS Overlay)

Ein vollautomatisches, echtzeitfähiges OBS-Overlay mit Gamification-Mana-System auf Basis von Whatnot-Streamdaten.

---

## 🌟 Features

- ⚡ **Echtzeit-Synchronisation**: Whatnot-Verkäufe werden via Chrome Extension (MutationObserver) und WebSocket Relay Server ohne Verzögerung übertragen.
- 🧙‍♂️ **RPG-Mana-Gamification**:
  - 📜 **Novize** (1 Kauf, Starter Mana)
  - 🧪 **Adept** (2 Käufe, Smaragd-Glow)
  - ⚡ **Akolyth** (3 - 5 Käufe, Blitzendes Mana)
  - 🔮 **Magister** (6 - 9 Käufe, Tiefes Arkan-Violett)
  - 🌟 **Erzmagus** (10+ Käufe, Kosmisches Gold, Sternenstaub & Rangkrone)
- 🌊 **Fluid Mana Bars**: Fließende, geschmeidige Fortschrittsbalken mit Schimmer- und Glanzeffekten.
- 🎆 **Mana-Surge & Level-Up Alerts**: Animierte Schockwellen-Banner & Konfetti-Explosionen bei Rangaufstiegen.
- 🎵 **Integrierte Sound-Synthese**: Prozedural generierte Kristall-Chimes und Fanfaren über die Web Audio API (keine externen Audio-Dateien nötig).
- 🎛️ **Streamer Control Deck**: Integrierter Live-Simulator, manuelle Mana-Korrekturen, Sound-Regler und Session-Reset unter `http://localhost:5173/#admin`.

---

## 📁 Projektstruktur

```
TopBuyerOverlay/
├── server/                      # Node.js WebSocket & REST Relay Server (Port 8080)
│   ├── src/
│   │   ├── index.ts             # Express + WS Broadcast Server
│   │   ├── state.ts             # Mana State, Rank Engine & Leaderboard Logic
│   │   ├── types.ts             # Shared TypeScript Interfaces
│   │   └── storage.ts           # JSON-Persistenz (data/session.json)
│   └── tsconfig.json
│
├── overlay/                     # React + Vite + Tailwind + Framer Motion
│   ├── src/
│   │   ├── components/
│   │   │   ├── ManaOverlay.tsx  # OBS Transparent Widget
│   │   │   ├── ManaBar.tsx      # Liquid Glowing Mana Bar
│   │   │   ├── RankBadge.tsx    # RPG Tier Badges & Auren
│   │   │   ├── ManaAlert.tsx    # Mana Surge / Level Up Banner & Konfetti
│   │   │   ├── Particles.tsx    # Schwebende Mana-Kristallpartikel
│   │   │   └── AdminDeck.tsx    # Streamer Steuerpult & Simulator
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts  # Auto-Reconnect WebSocket Client
│   │   │   └── useSoundEffects.ts # Sound-Synthesizer
│   │   └── App.tsx              # Overlay- & Admin-Routing
│   └── vite.config.ts
│
├── extension/                   # Chrome Extension (Manifest V3)
│   ├── manifest.json            # MV3 Manifest
│   ├── content.js               # MutationObserver für Whatnot Sales
│   ├── popup/                   # Verbindungsstatus & Test-Kauf Trigger
│   └── icons/                   # Icons (16x16, 48x48, 128x128)
│
└── package.json                 # Root Skripte (dev:all, dev:server, dev:overlay)
```

---

## 🚀 Schnellstart

### 1. Abhängigkeiten installieren
```bash
npm run install:all
```

### 2. Server & Overlay starten
```bash
npm run dev
```
- **OBS Overlay**: [http://localhost:5173](http://localhost:5173) (transparent)
- **Streamer Admin Deck**: [http://localhost:5173/#admin](http://localhost:5173/#admin)
- **WebSocket Relay Server**: `ws://localhost:8080` (HTTP: `http://localhost:8080`)

---

## 🎥 OBS Studio Integration

1. Öffne **OBS Studio**.
2. Erstelle eine neue Quelle: **Browser** (Browserquelle).
3. Konfiguriere die Einstellungen:
   - **URL**: `http://localhost:5173`
   - **Breite**: `480`
   - **Höhe**: `720` (oder `1080` je nach Layout)
   - **Benutzerdefiniertes CSS löschen**: Standardmäßig ist der Hintergrund des Overlays transparent (`bg-transparent`).
   - Optional: **Audio über OBS steuern** aktivieren, falls du die Soundeffekte über ein separates Mischpult regeln möchtest.
4. Positioniere das Overlay an deiner gewünschten Stelle im Stream.

---

## 🧩 Chrome Extension installieren (Whatnot Tab)

1. Öffne Google Chrome und navigiere zu `chrome://extensions`.
2. Aktiviere oben rechts den Schalter **Entwicklermodus**.
3. Klicke auf **Entpackte Erweiterung laden** (Load unpacked).
4. Wähle den Ordner `extension/` in diesem Projekt aus.
5. Öffne dein **Whatnot Seller Dashboard** oder einen Whatnot Live-Stream.
6. Die Extension verbindet sich automatisch mit `ws://localhost:8080` und überträgt Verkäufe in Echtzeit.

---

## 🎛️ Streamer Deck & Simulator (`/#admin`)

Unter `http://localhost:5173/#admin` kannst du:
- **Zufällige oder spezifische Test-Käufe auslösen** (perfekt zum Testen vor dem Stream).
- **Käufe manuell anpassen** (`+1` / `-1` Kauf für jeden User).
- **Lautstärke & Soundeffekte regeln** (oder stummschalten).
- **Anzahl angezeigter Top-Käufer einstellen** (Top 3, Top 5, Top 10).
- **Session zurücksetzen**, wenn ein neuer Stream beginnt.
