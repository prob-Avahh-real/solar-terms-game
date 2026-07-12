# solar-terms-game (节气游戏)

Solar terms farming simulation game based on the traditional Chinese 24 solar terms calendar.

## Tech Stack
- **Language:** JavaScript (Vanilla)
- **Rendering:** HTML5 Canvas
- **Mobile:** Capacitor (native wrapper)
- **PWA:** Service Worker + Manifest
- **Build:** Custom build script

## Getting Started
Open `index.html` in a browser — no build step required.

## Features
- 24 solar terms cycle with seasonal effects
- Farming, weather, and world simulation
- PWA support for offline play
- Capacitor config for native iOS/Android deployment
- Modular JS architecture (10 modules)

## Scripts
- `make install` — Install dependencies
- `make test` — Run tests
- `make lint` — Lint check
- `make format` — Format code

## Project Structure
```
├── index.html              # Entry point
├── js/
│   ├── main.js             # Game loop + init
│   ├── entities.js         # Game entities
│   ├── farming.js          # Farming mechanics
│   ├── player.js           # Player controller
│   ├── world.js            # World generation
│   ├── weather.js          # Weather system
│   ├── solarTerms.js       # Solar terms logic
│   ├── ui.js               # UI rendering
│   ├── mobile.js           # Mobile optimizations
│   └── native-bridge.js    # Native device bridge
├── css/style.css
├── capacitor.config.ts
├── sw.js / manifest.json
└── AGENTS.md
```
