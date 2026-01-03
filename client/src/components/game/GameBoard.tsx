import { useState, useCallback } from 'react';
import { GameCanvas } from '../../graphics/GameCanvas';
import { useGameStore } from '../../stores/gameStore';
import { useAIPlayers } from '../../hooks/useAIPlayers';
import { Button } from '../common/Button';
import { ColorPicker } from './ColorPicker';
import { SlapOverlay } from './SlapOverlay';
import { CustomRuleModal } from './CustomRuleModal';
import { SilenceReporter } from './SilenceReporter';
import { OfferCardUI } from './OfferCardUI';
import type { CardColor } from '../../types/game.types';
import type { AIDifficulty } from '../../ai/AIPlayer';

interface GameBoardProps {
  onExitGame: () => void;
  aiDifficulty?: AIDifficulty;
}

export function GameBoard({ onExitGame, aiDifficulty = 'medium' }: GameBoardProps) {
  const {
    gameState,
    engine,
    playCard,
    drawCard,
    callUno,
    selectColor,
    createCustomRule,
    slap,
    reportSpeaking,
    acceptOffer,
    declineOffer,
  } = useGameStore();

  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pendingCardId, setPendingCardId] = useState<string | null>(null);

  // Initialize AI players
  const hasAIPlayers = gameState?.players.some((p) => p.type === 'ai') ?? false;
  useAIPlayers({
    enabled: hasAIPlayers,
    difficulty: aiDifficulty,
  });

  if (!gameState || !engine) {
    return <div className="text-white">Loading...</div>;
  }

  // Get current player (first human player for now)
  const currentPlayerId = gameState.players[0].id;
  const currentPlayer = gameState.players.find((p) => p.id === currentPlayerId);
  const isMyTurn = gameState.players[gameState.currentPlayerIndex].id === currentPlayerId;

  // Get valid moves
  const validMoves = engine.getValidMoves(currentPlayerId);
  const validMoveIds = validMoves.map((c) => c.id);

  const handleCardClick = useCallback(
    (cardId: string) => {
      if (!isMyTurn) return;

      const card = currentPlayer?.hand.find((c) => c.id === cardId);
      if (!card) return;

      // Check if it's a valid move
      if (!validMoveIds.includes(cardId)) return;

      // If it's a wild card, show color picker
      if (card.color === 'wild') {
        setPendingCardId(cardId);
        setShowColorPicker(true);
        return;
      }

      // Play the card
      playCard(currentPlayerId, cardId);
    },
    [isMyTurn, currentPlayer, validMoveIds, playCard, currentPlayerId]
  );

  const handleDeckClick = useCallback(() => {
    if (!isMyTurn) return;
    drawCard(currentPlayerId);
  }, [isMyTurn, drawCard, currentPlayerId]);

  const handleColorSelect = useCallback(
    (color: CardColor) => {
      if (pendingCardId) {
        playCard(currentPlayerId, pendingCardId, color);
        setPendingCardId(null);
      } else if (gameState.phase === 'color_selection') {
        selectColor(currentPlayerId, color);
      }
      setShowColorPicker(false);
    },
    [pendingCardId, gameState.phase, playCard, selectColor, currentPlayerId]
  );

  const handleCallUno = useCallback(() => {
    callUno(currentPlayerId);
  }, [callUno, currentPlayerId]);

  const handleSlap = useCallback(() => {
    slap(currentPlayerId, Date.now());
  }, [slap, currentPlayerId]);

  const handleCreateRule = useCallback(
    (text: string, type: 'behavioral' | 'speech' | 'penalty' | 'action') => {
      createCustomRule(currentPlayerId, text, type);
    },
    [createCustomRule, currentPlayerId]
  );

  const handleReportSpeaking = useCallback(
    (targetId: string) => {
      reportSpeaking(currentPlayerId, targetId);
    },
    [reportSpeaking, currentPlayerId]
  );

  const handleAcceptOffer = useCallback(() => {
    acceptOffer(currentPlayerId);
  }, [acceptOffer, currentPlayerId]);

  const handleDeclineOffer = useCallback(() => {
    declineOffer(currentPlayerId);
  }, [declineOffer, currentPlayerId]);

  const canCallUno = currentPlayer && currentPlayer.hand.length === 2 && !currentPlayer.hasCalledUno;

  return (
    <div className="h-screen w-screen bg-gray-900 flex flex-col">
      {/* Top bar */}
      <div className="h-14 bg-gray-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-white">Spicy UNO</h1>
          {gameState.silenceMode && (
            <div className="bg-red-600 px-3 py-1 rounded-full text-white text-sm font-medium animate-pulse">
              SILENCE MODE
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Custom rules display */}
          {gameState.customRules.length > 0 && (
            <div className="text-gray-400 text-sm">
              {gameState.customRules.length} custom rule(s) active
            </div>
          )}
          <Button variant="secondary" size="sm" onClick={onExitGame}>
            Exit Game
          </Button>
        </div>
      </div>

      {/* Game area */}
      <div className="flex-1 flex items-center justify-center p-4">
        <GameCanvas
          gameState={gameState}
          currentPlayerId={currentPlayerId}
          onCardClick={handleCardClick}
          onDeckClick={handleDeckClick}
          validMoves={validMoveIds}
        />
      </div>

      {/* Bottom action bar */}
      <div className="h-20 bg-gray-800 flex items-center justify-center gap-4 px-4">
        <Button
          variant="secondary"
          size="lg"
          onClick={handleDeckClick}
          disabled={!isMyTurn}
        >
          Draw Card
        </Button>

        <Button
          variant="danger"
          size="lg"
          onClick={handleCallUno}
          disabled={!canCallUno}
          className="animate-pulse"
        >
          UNO!
        </Button>

        {gameState.phase === 'slap_race' && (
          <Button variant="success" size="lg" onClick={handleSlap} className="animate-bounce">
            SLAP!
          </Button>
        )}
      </div>

      {/* Overlays */}
      {(showColorPicker || gameState.phase === 'color_selection') && (
        <ColorPicker onSelect={handleColorSelect} onCancel={() => setShowColorPicker(false)} />
      )}

      {gameState.phase === 'slap_race' && <SlapOverlay onSlap={handleSlap} />}

      {gameState.phase === 'custom_rule_creation' && (
        <CustomRuleModal onSubmit={handleCreateRule} />
      )}

      {/* Silence mode reporter */}
      <SilenceReporter
        active={gameState.silenceMode}
        players={gameState.players}
        currentPlayerId={currentPlayerId}
        onReport={handleReportSpeaking}
      />

      {/* Offer card UI */}
      {gameState.phase === 'offering_card' && gameState.pendingAction && (
        <OfferCardUI
          pendingAction={gameState.pendingAction}
          players={gameState.players}
          currentPlayerId={currentPlayerId}
          onAccept={handleAcceptOffer}
          onDecline={handleDeclineOffer}
        />
      )}

      {/* Game over overlay */}
      {gameState.phase === 'game_over' && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl p-8 text-center">
            <h2 className="text-4xl font-bold text-yellow-400 mb-4">Game Over!</h2>
            <p className="text-2xl text-white mb-6">
              {gameState.players.find((p) => p.id === gameState.winner)?.name} wins!
            </p>
            <div className="flex gap-4 justify-center">
              <Button variant="primary" size="lg" onClick={() => engine.reset()}>
                Play Again
              </Button>
              <Button variant="secondary" size="lg" onClick={onExitGame}>
                Exit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
