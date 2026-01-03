import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../common/Button';
import type { Player } from '../../types/game.types';

interface AskForCardModalProps {
  isOpen: boolean;
  currentPlayerId: string;
  players: Player[];
  onSelectPlayer: (targetPlayerId: string) => void;
  onCancel: () => void;
}

export function AskForCardModal({
  isOpen,
  currentPlayerId,
  players,
  onSelectPlayer,
  onCancel,
}: AskForCardModalProps) {
  // Filter out the current player - can only ask others
  const otherPlayers = players.filter(
    (p) => p.id !== currentPlayerId && p.hand.length > 0
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
      >
        <motion.div
          className="bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl"
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🙏</div>
            <h2 className="text-2xl font-bold text-white">Ask for a Card</h2>
            <p className="text-gray-400 mt-2">
              Who do you want to ask for a card?
            </p>
            <p className="text-sm text-gray-500 mt-1">
              They'll offer you a face-down card
            </p>
          </div>

          {otherPlayers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-yellow-400">
                No players have cards to give.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {otherPlayers.map((player) => (
                <motion.button
                  key={player.id}
                  className="w-full bg-gray-700 hover:bg-gray-600 rounded-xl p-4 flex items-center justify-between transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelectPlayer(player.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center text-xl">
                      👤
                    </div>
                    <div className="text-left">
                      <div className="text-white font-medium">{player.name}</div>
                      <div className="text-gray-400 text-sm">
                        {player.hand.length} card{player.hand.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  <div className="text-gray-400">→</div>
                </motion.button>
              ))}
            </div>
          )}

          <div className="mt-6 flex justify-center">
            <Button variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
