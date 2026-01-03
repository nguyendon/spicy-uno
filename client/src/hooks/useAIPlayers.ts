import { useEffect, useRef, useCallback } from 'react';
import { AIPlayer, type AIDifficulty } from '../ai/AIPlayer';
import { useGameStore } from '../stores/gameStore';
import type { GameState } from '../types/game.types';

interface UseAIPlayersOptions {
  enabled: boolean;
  difficulty: AIDifficulty;
}

export function useAIPlayers({ enabled, difficulty }: UseAIPlayersOptions) {
  const aiPlayersRef = useRef<Map<string, AIPlayer>>(new Map());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { gameState, engine } = useGameStore();

  // Initialize AI players when game starts
  useEffect(() => {
    if (!enabled || !gameState) {
      aiPlayersRef.current.clear();
      return;
    }

    // Create AI players for non-human players
    gameState.players.forEach((player) => {
      if (player.type === 'ai' && !aiPlayersRef.current.has(player.id)) {
        aiPlayersRef.current.set(player.id, new AIPlayer(player.id, difficulty));
      }
    });

    // Cleanup AI players that no longer exist
    aiPlayersRef.current.forEach((_, id) => {
      if (!gameState.players.find((p) => p.id === id)) {
        aiPlayersRef.current.delete(id);
      }
    });
  }, [enabled, gameState?.players, difficulty]);

  // Process AI turns
  const processAITurn = useCallback(
    (state: GameState) => {
      if (!enabled || !engine) return;

      const currentPlayer = state.players[state.currentPlayerIndex];
      if (currentPlayer.type !== 'ai') return;

      const aiPlayer = aiPlayersRef.current.get(currentPlayer.id);
      if (!aiPlayer) return;

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Get AI decision
      const decision = aiPlayer.makeDecision(state);
      if (!decision) return;

      // Schedule the action with the AI's thinking delay
      timeoutRef.current = setTimeout(() => {
        // Check if game state is still valid
        const currentState = engine.getState();
        if (currentState.phase === 'game_over') return;

        // Check if AI should call UNO before playing
        if (
          decision.action.type === 'play_card' &&
          aiPlayer.shouldCallUno(currentState)
        ) {
          engine.dispatch({
            type: 'call_uno',
            playerId: aiPlayer.id,
          });
        }

        // Execute the action
        engine.dispatch(decision.action);
      }, decision.delay);
    },
    [enabled, engine]
  );

  // React to game state changes
  useEffect(() => {
    if (!enabled || !gameState || gameState.phase === 'game_over') {
      return;
    }

    // Process AI turn if it's an AI's turn
    processAITurn(gameState);

    // Handle slap race for all AI players
    if (gameState.phase === 'slap_race') {
      aiPlayersRef.current.forEach((aiPlayer) => {
        const decision = aiPlayer.makeDecision(gameState);
        if (decision && decision.action.type === 'slap') {
          setTimeout(() => {
            engine?.dispatch(decision.action);
          }, decision.delay);
        }
      });
    }

    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, gameState, processAITurn, engine]);

  // Check for UNO catches by AI
  useEffect(() => {
    if (!enabled || !gameState || !engine) return;

    // Check if any player has 1 card and hasn't called UNO
    gameState.players.forEach((player) => {
      if (player.hand.length === 1 && !player.hasCalledUno && player.type !== 'ai') {
        // Let AI players try to catch
        aiPlayersRef.current.forEach((aiPlayer) => {
          if (aiPlayer.shouldCatchUno(gameState, player.id)) {
            // Small delay before catching
            setTimeout(() => {
              engine.dispatch({
                type: 'catch_uno',
                playerId: aiPlayer.id,
                targetPlayerId: player.id,
              });
            }, 500 + Math.random() * 1000);
          }
        });
      }
    });
  }, [enabled, gameState?.players, engine]);

  return {
    aiPlayers: aiPlayersRef.current,
    isAITurn:
      enabled &&
      gameState &&
      gameState.players[gameState.currentPlayerIndex]?.type === 'ai',
  };
}
