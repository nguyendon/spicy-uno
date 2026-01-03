import { motion } from 'framer-motion';
import { Button } from '../common/Button';
import type { Player, PendingAction } from '../../types/game.types';

interface OfferCardUIProps {
  pendingAction: PendingAction;
  players: Player[];
  currentPlayerId: string;
  onAccept: () => void;
  onDecline: () => void;
}

export function OfferCardUI({
  pendingAction,
  players,
  currentPlayerId,
  onAccept,
  onDecline,
}: OfferCardUIProps) {
  const offerer = players.find((p) => p.id === pendingAction.offererId);
  const isTarget = pendingAction.targetPlayer === currentPlayerId;

  if (!isTarget) {
    // Show waiting state for other players
    return (
      <motion.div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="bg-gray-800 rounded-xl p-6 text-center">
          <div className="text-4xl mb-4">🎁</div>
          <p className="text-white">
            {offerer?.name} is offering a card...
          </p>
          <p className="text-gray-400 text-sm mt-2">Waiting for response</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="bg-gray-800 rounded-2xl p-8 max-w-md w-full mx-4 text-center"
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
      >
        <div className="text-6xl mb-4">🎁</div>
        <h2 className="text-2xl font-bold text-white mb-2">
          {offerer?.name} offers you a card!
        </h2>
        <p className="text-gray-400 mb-6">
          They're offering you a face-down card. Do you trust them?
          <br />
          <span className="text-yellow-400 font-medium">
            If you touch it, you must take it!
          </span>
        </p>

        {/* Mystery card visualization */}
        <motion.div
          className="relative mx-auto mb-8"
          style={{ width: 100, height: 150 }}
          animate={{
            rotateY: [0, 10, -10, 0],
          }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <div
            className="absolute inset-0 rounded-xl"
            style={{
              background: 'linear-gradient(135deg, #2C3E50, #1A252F)',
              border: '3px solid #34495E',
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-4xl">❓</div>
            </div>
          </div>
          <motion.div
            className="absolute -inset-2 rounded-xl border-2 border-yellow-400"
            animate={{
              opacity: [0.3, 0.7, 0.3],
            }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          />
        </motion.div>

        <div className="flex gap-4">
          <Button
            variant="success"
            size="lg"
            className="flex-1"
            onClick={onAccept}
          >
            Accept Card
          </Button>
          <Button
            variant="danger"
            size="lg"
            className="flex-1"
            onClick={onDecline}
          >
            Decline
          </Button>
        </div>

        <p className="text-gray-500 text-sm mt-4">
          The card could help you... or it could be trash! 🎲
        </p>
      </motion.div>
    </motion.div>
  );
}
