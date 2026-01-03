import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { GameState, GameConfig, GameAction, CardColor } from '../types/game.types';
import { GameEngine } from '../engine/GameEngine';

interface GameStore {
  // State
  engine: GameEngine | null;
  gameState: GameState | null;
  isLoading: boolean;
  error: string | null;
  selectedWildColor: CardColor | null;

  // Actions
  startGame: (config: GameConfig) => void;
  playCard: (playerId: string, cardId: string, wildColor?: CardColor) => void;
  drawCard: (playerId: string) => void;
  callUno: (playerId: string) => void;
  catchUno: (playerId: string, targetId: string) => void;
  slap: (playerId: string, timestamp: number) => void;
  selectColor: (playerId: string, color: CardColor) => void;
  createCustomRule: (playerId: string, text: string, type: 'behavioral' | 'speech' | 'penalty' | 'action') => void;
  reportSpeaking: (playerId: string, targetId: string) => void;
  offerCard: (playerId: string, targetId: string, cardId: string) => void;
  acceptOffer: (playerId: string) => void;
  declineOffer: (playerId: string) => void;
  passTurn: (playerId: string) => void;
  jumpIn: (playerId: string, cardId: string) => void;
  resetGame: () => void;
  setSelectedWildColor: (color: CardColor | null) => void;
}

export const useGameStore = create<GameStore>()(
  immer((set, get) => ({
    engine: null,
    gameState: null,
    isLoading: false,
    error: null,
    selectedWildColor: null,

    startGame: (config) => {
      const engine = new GameEngine(config);

      // Subscribe to state changes
      engine.on('state_changed', (newState: GameState) => {
        set((state) => {
          state.gameState = newState;
        });
      });

      set((state) => {
        state.engine = engine;
        state.gameState = engine.getState();
        state.error = null;
      });
    },

    playCard: (playerId, cardId, wildColor) => {
      const { engine } = get();
      if (!engine) return;

      const action: GameAction = {
        type: 'play_card',
        playerId,
        cardId,
        wildColor,
      };

      engine.dispatch(action);
    },

    drawCard: (playerId) => {
      const { engine } = get();
      if (!engine) return;

      engine.dispatch({
        type: 'draw_card',
        playerId,
      });
    },

    callUno: (playerId) => {
      const { engine } = get();
      if (!engine) return;

      engine.dispatch({
        type: 'call_uno',
        playerId,
      });
    },

    catchUno: (playerId, targetId) => {
      const { engine } = get();
      if (!engine) return;

      engine.dispatch({
        type: 'catch_uno',
        playerId,
        targetPlayerId: targetId,
      });
    },

    slap: (playerId, timestamp) => {
      const { engine } = get();
      if (!engine) return;

      engine.dispatch({
        type: 'slap',
        playerId,
        timestamp,
      });
    },

    selectColor: (playerId, color) => {
      const { engine } = get();
      if (!engine) return;

      engine.dispatch({
        type: 'select_color',
        playerId,
        wildColor: color,
      });
    },

    createCustomRule: (playerId, text, type) => {
      const { engine } = get();
      if (!engine) return;

      engine.dispatch({
        type: 'create_custom_rule',
        playerId,
        customRule: { text, type, createdBy: playerId },
      });
    },

    reportSpeaking: (playerId, targetId) => {
      const { engine } = get();
      if (!engine) return;

      engine.dispatch({
        type: 'report_speaking',
        playerId,
        targetPlayerId: targetId,
      });
    },

    offerCard: (playerId, targetId, cardId) => {
      const { engine } = get();
      if (!engine) return;

      engine.dispatch({
        type: 'offer_card',
        playerId,
        targetPlayerId: targetId,
        cardId,
      });
    },

    acceptOffer: (playerId) => {
      const { engine } = get();
      if (!engine) return;

      engine.dispatch({
        type: 'accept_offer',
        playerId,
      });
    },

    declineOffer: (playerId) => {
      const { engine } = get();
      if (!engine) return;

      engine.dispatch({
        type: 'decline_offer',
        playerId,
      });
    },

    passTurn: (playerId) => {
      const { engine } = get();
      if (!engine) return;

      engine.dispatch({
        type: 'pass_turn',
        playerId,
      });
    },

    jumpIn: (playerId, cardId) => {
      const { engine } = get();
      if (!engine) return;

      engine.dispatch({
        type: 'jump_in',
        playerId,
        cardId,
      });
    },

    resetGame: () => {
      const { engine } = get();
      if (engine) {
        engine.reset();
      }
    },

    setSelectedWildColor: (color) => {
      set((state) => {
        state.selectedWildColor = color;
      });
    },
  }))
);
