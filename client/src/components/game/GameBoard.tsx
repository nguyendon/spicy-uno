import { useState, useCallback, useEffect, useRef } from 'react';
import { GameCanvas } from '../../graphics/GameCanvas';
import { useGameStore } from '../../stores/gameStore';
import { useAIPlayers } from '../../hooks/useAIPlayers';
import { Button } from '../common/Button';
import { ColorPicker } from './ColorPicker';
import { SlapOverlay } from './SlapOverlay';
import { CustomRuleModal } from './CustomRuleModal';
import { SilenceReporter } from './SilenceReporter';
import { OfferCardUI } from './OfferCardUI';
import { AskForCardModal } from './AskForCardModal';
import { RespondToRequestUI } from './RespondToRequestUI';
import { PassDeviceScreen } from './PassDeviceScreen';
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
    requestCard,
    declineRequest,
    offerCard,
    acceptOffer,
    declineOffer,
  } = useGameStore();

  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pendingCardId, setPendingCardId] = useState<string | null>(null);
  const [showPassDevice, setShowPassDevice] = useState(false);
  const [viewingPlayerId, setViewingPlayerId] = useState<string | null>(null);
  const [showAskModal, setShowAskModal] = useState(false);
  const lastTurnIndexRef = useRef<number>(-1);

  // Determine if this is an AI game or local multiplayer
  const hasAIPlayers = gameState?.players.some((p) => p.type === 'ai') ?? false;
  const isLocalMultiplayer = !hasAIPlayers;

  // Initialize AI players
  useAIPlayers({
    enabled: hasAIPlayers,
    difficulty: aiDifficulty,
  });

  // Set initial viewing player
  useEffect(() => {
    if (gameState && !viewingPlayerId) {
      if (hasAIPlayers) {
        // In AI mode, always view as the human player (first one)
        const humanPlayer = gameState.players.find((p) => p.type === 'human');
        setViewingPlayerId(humanPlayer?.id ?? gameState.players[0].id);
      } else {
        // In local multiplayer, view as the current turn player
        setViewingPlayerId(gameState.players[gameState.currentPlayerIndex].id);
      }
      lastTurnIndexRef.current = gameState.currentPlayerIndex;
    }
  }, [gameState, viewingPlayerId, hasAIPlayers]);

  // Handle turn changes for local multiplayer
  useEffect(() => {
    if (!gameState || !isLocalMultiplayer) return;
    if (gameState.phase === 'game_over') return;

    // Detect turn change
    if (lastTurnIndexRef.current !== -1 &&
        lastTurnIndexRef.current !== gameState.currentPlayerIndex) {
      // Turn changed - show pass device screen
      setShowPassDevice(true);
    }
    lastTurnIndexRef.current = gameState.currentPlayerIndex;
  }, [gameState?.currentPlayerIndex, isLocalMultiplayer, gameState?.phase]);

  const handlePassDeviceReady = useCallback(() => {
    if (!gameState) return;
    setViewingPlayerId(gameState.players[gameState.currentPlayerIndex].id);
    setShowPassDevice(false);
  }, [gameState]);

  if (!gameState || !engine) {
    return <div className="text-white">Loading...</div>;
  }

  // Current viewing player
  const currentPlayerId = viewingPlayerId ?? gameState.players[0].id;
  const currentPlayer = gameState.players.find((p) => p.id === currentPlayerId);
  const activePlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = activePlayer.id === currentPlayerId;

  // Get valid moves for the viewing player
  const validMoves = engine.getValidMoves(currentPlayerId);
  const validMoveIds = validMoves.map((c) => c.id);

  const handleCardClick = (cardId: string) => {
    if (!isMyTurn) return;
    if (activePlayer.type === 'ai') return; // Don't let human play for AI

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
  };

  const handleDeckClick = () => {
    if (!isMyTurn) return;
    if (activePlayer.type === 'ai') return;
    drawCard(currentPlayerId);
  };

  const handleColorSelect = (color: CardColor) => {
    if (pendingCardId) {
      playCard(currentPlayerId, pendingCardId, color);
      setPendingCardId(null);
    } else if (gameState.phase === 'color_selection') {
      selectColor(currentPlayerId, color);
    }
    setShowColorPicker(false);
  };

  const handleCallUno = () => {
    callUno(currentPlayerId);
  };

  const handleSlap = () => {
    slap(currentPlayerId, Date.now());
  };

  const handleCreateRule = (text: string, type: 'behavioral' | 'speech' | 'penalty' | 'action') => {
    createCustomRule(currentPlayerId, text, type);
  };

  const handleReportSpeaking = (targetId: string) => {
    reportSpeaking(currentPlayerId, targetId);
  };

  const handleAcceptOffer = () => {
    acceptOffer(currentPlayerId);
  };

  const handleDeclineOffer = () => {
    declineOffer(currentPlayerId);
  };

  // Request a card from another player
  const handleRequestCard = (targetPlayerId: string) => {
    requestCard(currentPlayerId, targetPlayerId);
    setShowAskModal(false);
  };

  // Respond to a card request by offering a card
  const handleOfferCardResponse = (cardId: string) => {
    offerCard(currentPlayerId, cardId);
  };

  // Decline to give a card when asked
  const handleDeclineRequest = () => {
    declineRequest(currentPlayerId);
  };

  const canCallUno = currentPlayer && currentPlayer.hand.length === 2 && !currentPlayer.hasCalledUno && isMyTurn;

  // Check if current player is being asked for a card
  const isBeingAskedForCard =
    gameState.phase === 'card_request' &&
    gameState.pendingAction?.targetPlayer === currentPlayerId;

  // Show pass device screen for local multiplayer
  if (showPassDevice && isLocalMultiplayer) {
    return (
      <PassDeviceScreen
        nextPlayer={activePlayer}
        onReady={handlePassDeviceReady}
      />
    );
  }

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
          {hasAIPlayers && !isMyTurn && (
            <div className="bg-blue-600 px-3 py-1 rounded-full text-white text-sm font-medium">
              AI is thinking...
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Turn indicator */}
          <div className="text-gray-300 text-sm">
            {isMyTurn ? (
              <span className="text-green-400 font-medium">Your turn!</span>
            ) : (
              <span>{activePlayer.name}'s turn</span>
            )}
          </div>
          {/* Custom rules display */}
          {gameState.customRules.length > 0 && (
            <div className="text-gray-400 text-sm">
              {gameState.customRules.length} custom rule(s)
            </div>
          )}
          <Button variant="secondary" size="sm" onClick={onExitGame}>
            Exit
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
          validMoves={isMyTurn ? validMoveIds : []}
        />
      </div>

      {/* Bottom action bar */}
      <div className="h-20 bg-gray-800 flex items-center justify-center gap-4 px-4">
        <Button
          variant="secondary"
          size="lg"
          onClick={handleDeckClick}
          disabled={!isMyTurn || activePlayer.type === 'ai'}
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

        {/* Ask for Card button - any player can ask anytime */}
        {activePlayer.type !== 'ai' && (
          <Button
            variant="primary"
            size="lg"
            onClick={() => setShowAskModal(true)}
          >
            Ask for Card
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

      {/* Ask for Card modal */}
      <AskForCardModal
        isOpen={showAskModal}
        currentPlayerId={currentPlayerId}
        players={gameState.players}
        onSelectPlayer={handleRequestCard}
        onCancel={() => setShowAskModal(false)}
      />

      {/* Respond to card request UI */}
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
