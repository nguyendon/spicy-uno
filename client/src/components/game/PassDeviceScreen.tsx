import { motion } from 'framer-motion';
import { Button } from '../common/Button';
import type { Player } from '../../types/game.types';

interface PassDeviceScreenProps {
  nextPlayer: Player;
  onReady: () => void;
}

export function PassDeviceScreen({ nextPlayer, onReady }: PassDeviceScreenProps) {
  return (
    <motion.div
      className="fixed inset-0 bg-gray-900 flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="text-center"
        initial={{ scale: 0.8, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <motion.div
          className="text-6xl mb-6"
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          🔄
        </motion.div>

        <h2 className="text-3xl font-bold text-white mb-4">
          Pass the device to
        </h2>

        <motion.div
          className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-8"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          {nextPlayer.name}
        </motion.div>

        <p className="text-gray-400 mb-8">
          Don't peek at their cards!
        </p>

        <Button
          variant="success"
          size="lg"
          onClick={onReady}
          className="px-12 py-4 text-xl"
        >
          I'm Ready!
        </Button>
      </motion.div>
    </motion.div>
  );
}
