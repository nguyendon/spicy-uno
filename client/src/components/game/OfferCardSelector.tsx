import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../common/Button';
import type { Player, Card } from '../../types/game.types';

interface OfferCardSelectorProps {
  isOpen: boolean;
  currentPlayer: Player;
  stuckPlayers: Player[]; // Players with no valid moves
  onSelectCardAndPlayer: (cardId: string, targetPlayerId: string) => void;
  onCancel: () => void;
}

export function OfferCardSelector({
  isOpen,
  currentPlayer,
  stuckPlayers,
  onSelectCardAndPlayer,
  onCancel,
}: OfferCardSelectorProps) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [step, setStep] = useState<'select-card' | 'select-player'>('select-card');

  const handleCardSelect = (cardId: string) => {
    setSelectedCardId(cardId);
    setStep('select-player');
  };

  const handlePlayerSelect = (playerId: string) => {
    if (selectedCardId) {
      onSelectCardAndPlayer(selectedCardId, playerId);
      // Reset state
      setSelectedCardId(null);
      setStep('select-card');
    }
  };

  const handleBack = () => {
    setStep('select-card');
    setSelectedCardId(null);
  };

  const handleClose = () => {
    setSelectedCardId(null);
    setStep('select-card');
    onCancel();
  };

  const selectedCard = currentPlayer.hand.find((c) => c.id === selectedCardId);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
      >
        <motion.div
          className="bg-gray-800 rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl"
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          {step === 'select-card' ? (
            <>
              <div className="text-center mb-6">
                <div className="text-4xl mb-2">🎁</div>
                <h2 className="text-2xl font-bold text-white">Offer a Card</h2>
                <p className="text-gray-400 mt-2">
                  Select a card from your hand to offer (face-down)
                </p>
              </div>

              {stuckPlayers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-yellow-400">
                    No players are stuck right now.
                  </p>
                  <p className="text-gray-500 text-sm mt-2">
                    You can only offer cards to players who have no valid moves.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-gray-400 text-sm mb-4 text-center">
                    {stuckPlayers.map((p) => p.name).join(', ')}{' '}
                    {stuckPlayers.length === 1 ? 'has' : 'have'} no valid moves
                  </p>

                  <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto">
                    {currentPlayer.hand.map((card) => (
                      <motion.button
                        key={card.id}
                        className={`
                          aspect-[2/3] rounded-lg border-2 flex items-center justify-center
                          text-white font-bold text-lg
                          ${getCardBgColor(card)}
                          ${selectedCardId === card.id ? 'border-yellow-400 ring-2 ring-yellow-400' : 'border-transparent'}
                          hover:border-white transition-colors
                        `}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleCardSelect(card.id)}
                      >
                        {getCardDisplay(card)}
                      </motion.button>
                    ))}
                  </div>
                </>
              )}

              <div className="mt-6 flex justify-center">
                <Button variant="secondary" onClick={handleClose}>
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="text-4xl mb-2">🎯</div>
                <h2 className="text-2xl font-bold text-white">Choose a Player</h2>
                <p className="text-gray-400 mt-2">
                  Who do you want to offer this card to?
                </p>
                {selectedCard && (
                  <p className="text-sm text-gray-500 mt-1">
                    (They won't see what card it is)
                  </p>
                )}
              </div>

              <div className="space-y-3">
                {stuckPlayers.map((player) => (
                  <motion.button
                    key={player.id}
                    className="w-full bg-gray-700 hover:bg-gray-600 rounded-xl p-4 flex items-center justify-between transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handlePlayerSelect(player.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center text-xl">
                        👤
                      </div>
                      <div className="text-left">
                        <div className="text-white font-medium">{player.name}</div>
                        <div className="text-gray-400 text-sm">
                          {player.hand.length} cards • No valid moves
                        </div>
                      </div>
                    </div>
                    <div className="text-gray-400">→</div>
                  </motion.button>
                ))}
              </div>

              <div className="mt-6 flex justify-center gap-3">
                <Button variant="secondary" onClick={handleBack}>
                  ← Back
                </Button>
                <Button variant="secondary" onClick={handleClose}>
                  Cancel
                </Button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function getCardBgColor(card: Card): string {
  switch (card.color) {
    case 'red':
      return 'bg-red-500';
    case 'yellow':
      return 'bg-yellow-500 text-black';
    case 'green':
      return 'bg-green-500';
    case 'blue':
      return 'bg-blue-500';
    case 'wild':
      return 'bg-gradient-to-br from-red-500 via-yellow-500 to-blue-500';
    default:
      return 'bg-gray-500';
  }
}

function getCardDisplay(card: Card): string {
  if (typeof card.value === 'number') {
    return card.value.toString();
  }
  switch (card.value) {
    case 'skip':
      return '⊘';
    case 'reverse':
      return '⇄';
    case 'draw2':
      return '+2';
    case 'wild':
      return 'W';
    case 'wild_draw4':
      return '+4';
    default:
      return '?';
  }
}
