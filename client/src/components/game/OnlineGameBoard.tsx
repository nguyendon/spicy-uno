import { useState, useCallback, useEffect } from 'react';
import { GameCanvas } from '../../graphics/GameCanvas';
import { socketService } from '../../multiplayer/socketService';
import { Button } from '../common/Button';
import { ColorPicker } from './ColorPicker';
import { SlapOverlay } from './SlapOverlay';
import { CustomRuleModal } from './CustomRuleModal';
import { SilenceReporter } from './SilenceReporter';
import { OfferCardUI } from './OfferCardUI';
import { AskForCardModal } from './AskForCardModal';
import { RespondToRequestUI } from './RespondToRequestUI';
import type { GameState, CardColor } from '../../types/game.types';

interface OnlineGameBoardProps {
  initialState: GameState;
  playerId: string;
  onExitGame: () => void;
}

export function OnlineGameBoard({ initialState, playerId, onExitGame }: OnlineGameBoardProps) {
  const [gameState, setGameState] = useState<GameState>(initialState);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pendingCardId, setPendingCardId] = useState<string | null>(null);
  const [showAskModal, setShowAskModal] = useState(false);

  // Subscribe to game state updates
  useEffect(() => {
    socketService.setCallbacks({
      onGameStateUpdated: (state) => {
        setGameState(state);
      },
      onDisconnected: () => {
        // Handle disconnect
        onExitGame();
      },
    });
  }, [onExitGame]);

  const currentPlayer = gameState.players.find((p) => p.id === playerId);
  const activePlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = activePlayer?.id === playerId;

  // Calculate valid moves locally (cards that match color/value)
  const getValidMoveIds = useCallback((): string[] => {
    if (!currentPlayer || !isMyTurn) return [];

    const topCard = gameState.discardPile[gameState.discardPile.length - 1];
    const effectiveColor = gameState.selectedWildColor || topCard?.color;

    // If there's stacked draw, only +2/+4 can be played
    if (gameState.stackedDrawAmount > 0) {
      return currentPlayer.hand
        .filter((c) => c.value === 'draw2' || c.value === 'wild_draw4')
        .map((c) => c.id);
    }

    return currentPlayer.hand
      .filter((card) => {
        if (card.color === 'wild') return true;
        if (card.color === effectiveColor) return true;
        if (card.value === topCard?.value) return true;
        return false;
      })
      .map((c) => c.id);
  }, [currentPlayer, isMyTurn, gameState]);

  const validMoveIds = getValidMoveIds();

  const handleCardClick = (cardId: string) => {
    if (!isMyTurn) return;
    if (!validMoveIds.includes(cardId)) return;

    const card = currentPlayer?.hand.find((c) => c.id === cardId);
    if (!card) return;

    // If it's a wild card, show color picker
    if (card.color === 'wild') {
      setPendingCardId(cardId);
      setShowColorPicker(true);
      return;
    }

    // Play the card
    socketService.sendAction({ type: 'play_card', cardId });
  };

  const handleDeckClick = () => {
    if (!isMyTurn) return;
    socketService.sendAction({ type: 'draw_card' });
  };

  const handleColorSelect = (color: CardColor) => {
    if (pendingCardId) {
      socketService.sendAction({ type: 'play_card', cardId: pendingCardId, wildColor: color });
      setPendingCardId(null);
    } else if (gameState.phase === 'color_selection') {
      socketService.sendAction({ type: 'select_color', wildColor: color });
    }
    setShowColorPicker(false);
  };

  const handleCallUno = () => {
    socketService.sendAction({ type: 'call_uno' });
  };

  const handleSlap = () => {
    socketService.sendAction({ type: 'slap', timestamp: Date.now() });
  };

  const handleCreateRule = (text: string, type: 'behavioral' | 'speech' | 'penalty' | 'action') => {
    socketService.sendAction({
      type: 'create_custom_rule',
      customRule: { text, type, createdBy: playerId },
    });
  };

  const handleReportSpeaking = (targetId: string) => {
    socketService.sendAction({ type: 'report_speaking', targetPlayerId: targetId });
  };

  const handleRequestCard = (targetPlayerId: string) => {
    socketService.sendAction({ type: 'request_card', targetPlayerId });
    setShowAskModal(false);
  };

  const handleOfferCardResponse = (cardId: string) => {
    socketService.sendAction({ type: 'offer_card', cardId });
  };

  const handleDeclineRequest = () => {
    socketService.sendAction({ type: 'decline_request' });
  };

  const handleAcceptOffer = () => {
    socketService.sendAction({ type: 'accept_offer' });
  };

  const handleDeclineOffer = () => {
    socketService.sendAction({ type: 'decline_offer' });
  };

  const canCallUno = currentPlayer && currentPlayer.hand.length === 2 && !currentPlayer.hasCalledUno && isMyTurn;

  const isBeingAskedForCard =
    gameState.phase === 'card_request' &&
    gameState.pendingAction?.targetPlayer === playerId;

  const handleExit = () => {
    socketService.disconnect();
    onExitGame();
  };

  return (
    <div className="h-screen w-screen bg-gray-900 flex flex-col">
      {/* Top bar */}
      <div className="h-14 bg-gray-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-white">Spicy UNO</h1>
          <span className="text-purple-400 text-sm">Online</span>
          {gameState.silenceMode && (
            <div className="bg-red-600 px-3 py-1 rounded-full text-white text-sm font-medium animate-pulse">
              SILENCE MODE
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="text-gray-300 text-sm">
            {isMyTurn ? (
              <span className="text-green-400 font-medium">Your turn!</span>
            ) : (
              <span>{activePlayer?.name}'s turn</span>
            )}
          </div>
          {gameState.customRules.length > 0 && (
            <div className="text-gray-400 text-sm">
              {gameState.customRules.length} custom rule(s)
            </div>
          )}
          <Button variant="secondary" size="sm" onClick={handleExit}>
            Exit
          </Button>
        </div>
      </div>

      {/* Game area */}
      <div className="flex-1 flex items-center justify-center p-4">
        <GameCanvas
          gameState={gameState}
          currentPlayerId={playerId}
          onCardClick={handleCardClick}
          onDeckClick={handleDeckClick}
          validMoves={isMyTurn ? validMoveIds : []}
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
          className={canCallUno ? 'animate-pulse' : ''}
        >
          UNO!
        </Button>

        {gameState.phase === 'slap_race' && (
          <Button variant="success" size="lg" onClick={handleSlap} className="animate-bounce">
            SLAP!
          </Button>
        )}

        <Button
          variant="primary"
          size="lg"
          onClick={() => setShowAskModal(true)}
        >
          Ask for Card
        </Button>
      </div>

      {/* Overlays */}
      {(showColorPicker || gameState.phase === 'color_selection') && (
        <ColorPicker onSelect={handleColorSelect} onCancel={() => setShowColorPicker(false)} />
      )}

      {gameState.phase === 'slap_race' && <SlapOverlay onSlap={handleSlap} />}

      {gameState.phase === 'custom_rule_creation' && activePlayer?.id === playerId && (
        <CustomRuleModal onSubmit={handleCreateRule} />
      )}

      <SilenceReporter
        active={gameState.silenceMode}
        players={gameState.players}
        currentPlayerId={playerId}
        onReport={handleReportSpeaking}
      />

      {gameState.phase === 'offering_card' && gameState.pendingAction?.targetPlayer === playerId && (
        <OfferCardUI
          pendingAction={gameState.pendingAction}
          players={gameState.players}
          currentPlayerId={playerId}
          onAccept={handleAcceptOffer}
          onDecline={handleDeclineOffer}
        />
      )}

      <AskForCardModal
        isOpen={showAskModal}
        currentPlayerId={playerId}
        players={gameState.players}
        onSelectPlayer={handleRequestCard}
        onCancel={() => setShowAskModal(false)}
      />

      {isBeingAskedForCard && currentPlayer && gameState.pendingAction && (
        <RespondToRequestUI
          pendingAction={gameState.pendingAction}
          players={gameState.players}
          currentPlayer={currentPlayer}
          onSelectCard={handleOfferCardResponse}
          onDecline={handleDeclineRequest}
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
            <Button variant="secondary" size="lg" onClick={handleExit}>
              Exit
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
