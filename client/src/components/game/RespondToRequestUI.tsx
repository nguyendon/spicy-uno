import { motion } from 'framer-motion';
import type { Player, Card, PendingAction } from '../../types/game.types';

interface RespondToRequestUIProps {
  pendingAction: PendingAction;
  players: Player[];
  currentPlayer: Player;
  onSelectCard: (cardId: string) => void;
}

export function RespondToRequestUI({
  pendingAction,
  players,
  currentPlayer,
  onSelectCard,
}: RespondToRequestUIProps) {
  const requester = players.find((p) => p.id === pendingAction.requesterId);

  if (!requester) return null;

  return (
    <motion.div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="bg-gray-800 rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
      >
        <div className="text-center mb-6">
          <motion.div
            className="text-4xl mb-2"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            🎴
          </motion.div>
          <h2 className="text-2xl font-bold text-white">
            {requester.name} is asking for a card!
          </h2>
          <p className="text-gray-400 mt-2">
            Select a card to give them (face-down)
          </p>
          <p className="text-sm text-yellow-400 mt-1">
            Choose wisely... or bluff!
          </p>
        </div>

        <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto">
          {currentPlayer.hand.map((card) => (
            <motion.button
              key={card.id}
              className={`
                aspect-[2/3] rounded-lg border-2 flex items-center justify-center
                text-white font-bold text-lg border-transparent
                ${getCardBgColor(card)}
                hover:border-white transition-colors
              `}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSelectCard(card.id)}
            >
              {getCardDisplay(card)}
            </motion.button>
          ))}
        </div>

        <p className="text-center text-gray-500 text-sm mt-4">
          They won't see what card you're offering until they accept
        </p>
      </motion.div>
    </motion.div>
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
