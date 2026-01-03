# Spicy Uno - Web Game Implementation Plan

## Overview
Build a web-based Spicy Uno game with impressive graphics, supporting local multiplayer, online multiplayer, and single-player vs AI.

## Tech Stack
| Layer | Technology | Status |
|-------|------------|--------|
| Build Tool | Vite | ✅ Done |
| Frontend | React 18 + TypeScript | ✅ Done |
| State | Zustand + Immer | ✅ Done |
| Graphics | Canvas 2D + React overlays | ✅ Done |
| Animation | Framer Motion | ✅ Done |
| Backend | Node.js + Express + Socket.IO | ⏳ Pending |
| Styling | Tailwind CSS v4 | ✅ Done |

## Spicy Rules
| Rule | Description | Status |
|------|-------------|--------|
| 7 = Silence | Everyone silent until next 7; draw 1 when caught speaking | ✅ Done |
| 0 = Custom Rule | Player creates a new house rule | ✅ Done |
| Stack +2/+4 | Chain draw cards to pass penalty | ✅ Done |
| Stack Skips | Chain skip cards | ✅ Done |
| 5 = Slap | Race to slap, last person draws 1 | ✅ Done |
| Jump-in | Play exact match (color + number) out of turn | ✅ Done |
| Must say UNO | Penalty for forgetting | ✅ Done |
| Offer cards | Offer face-down cards to stuck players (bluffing) | ✅ Done |

---

## Implementation Phases

### Phase 1: Foundation ✅ COMPLETE
- [x] Initialize Vite + React + TypeScript project
- [x] Configure Tailwind CSS v4
- [x] Create project folder structure
- [x] Implement core types (`game.types.ts`)
- [x] Implement CardDeck (create, shuffle, draw, validation)
- [x] Implement EventBus for game events
- [x] Implement GameEngine with full Uno rules + all spicy rules
- [x] Create Zustand game store
- [x] Build Canvas 2D card renderer (programmatic cards)
- [x] Build animation engine with easing functions
- [x] Create GameCanvas component
- [x] Build MainMenu with game config and rule toggles
- [x] Build GameBoard with player hand, draw/discard piles
- [x] Add ColorPicker for wild cards
- [x] Add SlapOverlay for 5 = Slap rule
- [x] Add CustomRuleModal for 0 = Custom Rule

### Phase 2: Enhanced UI & AI ✅ COMPLETE
- [x] Add SilenceReporter component (report speaking during silence)
- [x] Add OfferCardUI component (accept/decline face-down cards)
- [x] Implement AIPlayer class with difficulty levels
- [x] Implement useAIPlayers hook
- [x] AI strategies: Easy (random), Medium (basic), Hard (optimal)
- [x] AI handles slap races, custom rules, UNO calls

### Phase 3: Turn Management ✅ COMPLETE
- [x] Add PassDeviceScreen for local hot-seat multiplayer
- [x] Fix turn switching between players
- [x] Add turn indicator in top bar
- [x] AI auto-plays when it's their turn

---

### Phase 4: Graphics Polish ⏳ IN PROGRESS
- [ ] Add smooth card play animations (arc movement)
- [ ] Add card draw animations (flip reveal)
- [ ] Add hand reorganization animations
- [ ] Add particle effects for special cards (+4, UNO call)
- [ ] Add screen shake for big plays
- [ ] Add glow pulse for playable cards
- [ ] Improve card sprites (gradient, shadows, shine)
- [ ] Add table felt texture
- [ ] Add direction change animation

### Phase 5: Audio
- [ ] Add sound effects:
  - Card play
  - Card draw
  - UNO call
  - Slap
  - Invalid move
  - Win/lose
- [ ] Add background music (optional, toggleable)
- [ ] Add volume controls

### Phase 6: Online Multiplayer
- [ ] Set up Node.js + Express server
- [ ] Integrate Socket.IO
- [ ] Implement room system (create/join/browse)
- [ ] Server-authoritative game state
- [ ] State synchronization
- [ ] Latency compensation for slap races
- [ ] Reconnection handling
- [ ] Player ready system
- [ ] Host controls

### Phase 7: Polish & Launch
- [ ] Settings panel (rules toggle, audio, graphics quality)
- [ ] Player profiles/avatars
- [ ] How to play guide
- [ ] Unit tests for game engine
- [ ] Integration tests
- [ ] Deploy frontend (Vercel/Netlify)
- [ ] Deploy backend (Railway/Fly.io)
- [ ] Custom domain + SSL

---

## Project Structure
```
spicy-uno/
├── client/                          # React frontend
│   ├── src/
│   │   ├── ai/
│   │   │   └── AIPlayer.ts          # AI opponent logic ✅
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   └── Button.tsx       # Reusable button ✅
│   │   │   ├── game/
│   │   │   │   ├── GameBoard.tsx    # Main game UI ✅
│   │   │   │   ├── ColorPicker.tsx  # Wild card color selection ✅
│   │   │   │   ├── SlapOverlay.tsx  # Slap race UI ✅
│   │   │   │   ├── CustomRuleModal.tsx # Create house rules ✅
│   │   │   │   ├── SilenceReporter.tsx # Report speaking ✅
│   │   │   │   ├── OfferCardUI.tsx  # Card offering UI ✅
│   │   │   │   └── PassDeviceScreen.tsx # Hot-seat turn switch ✅
│   │   │   └── lobby/
│   │   │       └── MainMenu.tsx     # Game setup ✅
│   │   ├── engine/
│   │   │   ├── CardDeck.ts          # Deck management ✅
│   │   │   ├── EventBus.ts          # Event system ✅
│   │   │   └── GameEngine.ts        # Core game logic ✅
│   │   ├── graphics/
│   │   │   ├── GameCanvas.tsx       # Main canvas ✅
│   │   │   ├── renderers/
│   │   │   │   └── CardRenderer.ts  # Card drawing ✅
│   │   │   └── animations/
│   │   │       └── AnimationEngine.ts # Animation system ✅
│   │   ├── hooks/
│   │   │   └── useAIPlayers.ts      # AI management hook ✅
│   │   ├── stores/
│   │   │   └── gameStore.ts         # Zustand game state ✅
│   │   ├── types/
│   │   │   └── game.types.ts        # TypeScript types ✅
│   │   ├── App.tsx                  # Root component ✅
│   │   ├── main.tsx                 # Entry point ✅
│   │   └── index.css                # Global styles ✅
│   ├── package.json
│   └── vite.config.ts
│
├── server/                          # Node.js backend (Phase 6)
│   └── src/
│       ├── index.ts                 # Server entry
│       ├── socket/
│       │   ├── SocketHandler.ts     # Connection management
│       │   └── GameHandler.ts       # Game action handlers
│       └── game/
│           └── ServerGameEngine.ts  # Authoritative game state
│
└── plan.md                          # This file
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `client/src/engine/GameEngine.ts` | Core game logic, rule processing, state management |
| `client/src/engine/CardDeck.ts` | Card creation, shuffling, validation |
| `client/src/stores/gameStore.ts` | Zustand store connecting UI to engine |
| `client/src/graphics/GameCanvas.tsx` | Canvas rendering of game board |
| `client/src/graphics/renderers/CardRenderer.ts` | Programmatic card drawing |
| `client/src/ai/AIPlayer.ts` | AI decision making with difficulty levels |
| `client/src/components/game/GameBoard.tsx` | Main game UI orchestration |

---

## Running the Game

```bash
cd client
npm install
npm run dev
```

Open http://localhost:5173

---

## Git Commits History
1. **Phase 1: Foundation** - Core game engine, Canvas rendering, basic UI
2. **Phase 2: Spicy Rules UI & AI** - Silence reporter, offer cards, AI opponents
3. **Turn Management Fix** - Pass device screen, proper turn switching
